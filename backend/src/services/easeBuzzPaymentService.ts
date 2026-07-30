// services/easeBuzzPaymentService.ts
//
// Easebuzz Payment Gateway integration (Hosted Checkout + Transaction +
// Refund APIs).
//
// Wraps payment initiation, transaction lookup, refunds, refund status, and
// response/webhook hash verification behind a small set of functions.
// Credentials are read from environment variables lazily (inside each
// call), so a server without Easebuzz configured can still boot - it only
// fails when a payment operation is actually attempted:
//
//   EASEBUZZ_KEY  - Easebuzz merchant key
//   EASEBUZZ_SALT - Easebuzz salt, used for request signing and response
//                   verification
//   EASEBUZZ_ENV  - 'TEST' | 'PROD', defaults to 'TEST' (only used when a
//                   call doesn't specify its own environment - see
//                   toEasebuzzEnvironment below)
//
// Docs: https://docs.easebuzz.in/docs/payment-gateway/

import crypto from "crypto";

export type EasebuzzEnvironment = "TEST" | "PROD";

export interface EasebuzzConfig {
    key: string;
    salt: string;
    environment: EasebuzzEnvironment;
}

/**
 * Thrown for any request Easebuzz rejects, either at the HTTP level or via
 * its own `{ status: 0, data: "..." }` envelope. `details` carries the raw
 * parsed response body so callers can inspect it without this module
 * needing to know about every error shape Easebuzz returns.
 */
export class EasebuzzApiError extends Error {
    httpStatus: number;
    details?: any;

    constructor(message: string, httpStatus: number, details?: any) {
        super(message);
        this.name = "EasebuzzApiError";
        this.httpStatus = httpStatus;
        this.details = details;
    }
}

/**
 * Maps `merchant_payment_gateway_mapping.environment` ('PROD', 'TEST',
 * 'UAT', 'SANDBOX', ...) onto Easebuzz's own two-environment model.
 * Anything other than 'PROD' is treated as test, so test/staging traffic
 * never accidentally hits Easebuzz's production endpoint.
 */
export function toEasebuzzEnvironment(mappingEnvironment?: string | null): EasebuzzEnvironment {
    return mappingEnvironment?.trim().toUpperCase() === "PROD" ? "PROD" : "TEST";
}

/**
 * Merchant-specific override for the Easebuzz key/salt, sourced from
 * `merchant_payment_gateway_mapping.api_id` / `.encryption_key`. When not
 * supplied, falls back to the platform-wide EASEBUZZ_KEY/SALT env vars, so
 * single-tenant/dev setups keep working unchanged.
 */
export interface EasebuzzCredentialOverride {
    key?: string | null;
    salt?: string | null;
}

function resolveConfig(
    environment?: EasebuzzEnvironment,
    overrides?: EasebuzzCredentialOverride,
): EasebuzzConfig {
    const key = overrides?.key || process.env.EASEBUZZ_KEY;
    const salt = overrides?.salt || process.env.EASEBUZZ_SALT;

    if (!key || !salt) {
        throw new Error("Missing Easebuzz credentials: configure EASEBUZZ_KEY / EASEBUZZ_SALT, or set api_id / encryption_key on the merchant's payment gateway mapping.");
    }

    return {
        key: key.trim(),
        salt: salt.trim(),
        environment: environment ?? (process.env.EASEBUZZ_ENV === "PROD" ? "PROD" : "TEST"),
    };
}

/** Base URL for the hosted-checkout endpoints (`payment/initiateLink`, `pay/{access_key}`). */
function payBaseUrl(environment: EasebuzzEnvironment): string {
    return environment === "PROD" ? "https://pay.easebuzz.in/" : "https://testpay.easebuzz.in/";
}

/** Base URL for the dashboard endpoints (transaction lookup, refunds, refund status). */
function dashboardBaseUrl(environment: EasebuzzEnvironment): string {
    return environment === "PROD" ? "https://dashboard.easebuzz.in/" : "https://testdashboard.easebuzz.in/";
}

/** Trims a value to a string, or "" if it's missing - matches how Easebuzz expects unset fields in its hash sequences. */
function normalize(value: unknown): string {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

/**
 * Builds an Easebuzz request hash: SHA-512 of every field in `fields`
 * (looked up in `values`, trimmed, "" if absent) pipe-joined, with `salt`
 * appended as the final segment. This mirrors Easebuzz's own hash
 * generation exactly, including keeping the pipe separator for empty
 * fields (e.g. unset udf1..udf10) rather than omitting them.
 */
function buildRequestHash(fields: string[], values: Record<string, unknown>, salt: string): string {
    const parts = fields.map((f) => normalize(values[f]));
    parts.push(salt);
    return crypto.createHash("sha512").update(parts.join("|")).digest("hex");
}

/** Formats an amount the way Easebuzz requires: a string with exactly two decimal places. */
function formatAmount(amount: number | string): string {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!Number.isFinite(num)) {
        throw new Error("Invalid amount: must be a finite number.");
    }
    return num.toFixed(2);
}

interface EasebuzzEnvelope {
    status: 0 | 1;
    data: any;
}

/**
 * POSTs form-encoded params to an Easebuzz endpoint and unwraps its
 * `{ status, data }` envelope, throwing EasebuzzApiError when
 * `status !== 1` (Easebuzz reports business errors this way even on an
 * HTTP 200) or when the HTTP call itself fails.
 */
async function easebuzzRequest(url: string, params: Record<string, unknown>): Promise<any> {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === "") continue;
        body.set(key, String(value));
    }

    let res: Response;
    let raw: string;
    try {
        res = await fetch(url, { method: "POST", body });
        raw = await res.text();
    } catch (err: any) {
        throw new EasebuzzApiError(`Failed to reach Easebuzz: ${err?.message || "network error"}`, 0);
    }

    let envelope: EasebuzzEnvelope;
    try {
        envelope = raw ? JSON.parse(raw) : { status: 0, data: "Empty response from Easebuzz" };
    } catch {
        throw new EasebuzzApiError("Unexpected non-JSON response from Easebuzz", res.status, raw);
    }

    if (!res.ok || Number(envelope.status) !== 1) {
        const message = typeof envelope.data === "string" ? envelope.data : "Easebuzz request failed";
        throw new EasebuzzApiError(message, res.status, envelope.data);
    }

    return envelope.data;
}

// ---------------------------------------------------------------------------
// Initiate Payment (hosted checkout)
// ---------------------------------------------------------------------------

export interface EasebuzzPaymentParams {
    /** Merchant-side unique transaction id (max 40 chars: letters, digits, `_ | - /`). */
    txnid: string;
    amount: number | string;
    firstname: string;
    email: string;
    phone: string;
    productinfo: string;
    /** Where Easebuzz redirects/POSTs on a successful payment. */
    surl: string;
    /** Where Easebuzz redirects/POSTs on a failed payment. */
    furl: string;
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
    udf6?: string;
    udf7?: string;
    /** Included in the request hash but never sent in the request body (Easebuzz convention). */
    udf8?: string;
    udf9?: string;
    udf10?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    country?: string;
    zipcode?: string;
    sub_merchant_id?: string;
    unique_id?: string;
    /** Comma-separated payment modes to restrict checkout to, e.g. "NB,DC,CC,UPI". */
    show_payment_mode?: string;
    /** Split-settlement config, e.g. `{ label_bank1: 100, label_bank2: 100 }`. */
    split_payments?: Record<string, number>;
    environment?: EasebuzzEnvironment;
    /** Merchant-specific credentials (from merchant_payment_gateway_mapping); falls back to env vars when omitted. */
    credentials?: EasebuzzCredentialOverride;
}

export interface EasebuzzInitiateResult {
    accessKey: string;
    /** Hosted checkout URL - redirect the customer's browser here. */
    paymentUrl: string;
}

const INITIATE_HASH_FIELDS = [
    "key", "txnid", "amount", "productinfo", "firstname", "email",
    "udf1", "udf2", "udf3", "udf4", "udf5", "udf6", "udf7", "udf8", "udf9", "udf10",
];

const INITIATE_REQUIRED_FIELDS: (keyof EasebuzzPaymentParams)[] = [
    "txnid", "amount", "firstname", "email", "phone", "productinfo", "surl", "furl",
];

/**
 * Initiates an Easebuzz hosted-checkout payment and returns the access key
 * plus the ready-to-redirect checkout URL. Redirect the customer's browser
 * to `paymentUrl`; Easebuzz will POST the result back to `surl`/`furl`,
 * which should be verified with `verifyResponseHash`.
 */
export async function initiatePayment(params: EasebuzzPaymentParams): Promise<EasebuzzInitiateResult> {
    for (const field of INITIATE_REQUIRED_FIELDS) {
        if (!normalize(params[field] as any)) {
            throw new Error(`Missing required Easebuzz payment field: ${String(field)}`);
        }
    }

    const config = resolveConfig(params.environment, params.credentials);
    const amount = formatAmount(params.amount);

    const hashValues: Record<string, unknown> = {
        key: config.key,
        txnid: params.txnid,
        amount,
        productinfo: params.productinfo,
        firstname: params.firstname,
        email: params.email,
        udf1: params.udf1,
        udf2: params.udf2,
        udf3: params.udf3,
        udf4: params.udf4,
        udf5: params.udf5,
        udf6: params.udf6,
        udf7: params.udf7,
        udf8: params.udf8,
        udf9: params.udf9,
        udf10: params.udf10,
    };
    const hash = buildRequestHash(INITIATE_HASH_FIELDS, hashValues, config.salt);

    // udf8-10 are part of the hash but must NOT be sent in the request body
    // (this is an Easebuzz convention, not an oversight).
    const data = await easebuzzRequest(`${payBaseUrl(config.environment)}payment/initiateLink`, {
        key: config.key,
        txnid: params.txnid,
        amount,
        productinfo: params.productinfo,
        firstname: params.firstname,
        email: params.email,
        phone: params.phone,
        surl: params.surl,
        furl: params.furl,
        udf1: params.udf1,
        udf2: params.udf2,
        udf3: params.udf3,
        udf4: params.udf4,
        udf5: params.udf5,
        udf6: params.udf6,
        udf7: params.udf7,
        address1: params.address1,
        address2: params.address2,
        city: params.city,
        state: params.state,
        country: params.country,
        zipcode: params.zipcode,
        sub_merchant_id: params.sub_merchant_id,
        unique_id: params.unique_id,
        show_payment_mode: params.show_payment_mode,
        split_payments: params.split_payments ? JSON.stringify(params.split_payments) : undefined,
        hash,
    });

    const accessKey = typeof data === "string" ? data : data?.access_key;
    if (!accessKey || !/^[a-f0-9]{64}$/i.test(accessKey)) {
        throw new EasebuzzApiError("Easebuzz returned an invalid access key", 200, data);
    }

    return {
        accessKey,
        paymentUrl: `${payBaseUrl(config.environment)}pay/${accessKey}`,
    };
}

// ---------------------------------------------------------------------------
// Transaction lookup
// ---------------------------------------------------------------------------

export interface EasebuzzTransaction {
    txnid: string;
    easepayid?: string;
    status?: string;
    amount?: string;
    net_amount_debit?: string;
    mode?: string;
    payment_source?: string;
    addedon?: string;
    email?: string;
    phone?: string;
    productinfo?: string;
    error_Message?: string;
    [key: string]: any;
}

/** Looks up a transaction's current status/details by the merchant-side `txnid` used to create it. */
export async function getTransaction(
    txnid: string,
    environment?: EasebuzzEnvironment,
    credentials?: EasebuzzCredentialOverride,
): Promise<EasebuzzTransaction> {
    const config = resolveConfig(environment, credentials);
    const values = { key: config.key, txnid };
    const hash = buildRequestHash(["key", "txnid"], values, config.salt);

    return easebuzzRequest(`${dashboardBaseUrl(config.environment)}transaction/v2/retrieve`, {
        ...values,
        hash,
    });
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export interface CreateRefundParams {
    /** Easebuzz's transaction id (`easepayid`) from the original payment/transaction lookup. */
    easebuzzId: string;
    /** Merchant-side unique id for this refund. */
    merchantRefundId: string;
    refundAmount: number | string;
    environment?: EasebuzzEnvironment;
    credentials?: EasebuzzCredentialOverride;
}

export interface EasebuzzRefundResult {
    refund_id?: string;
    merchant_refund_id?: string;
    easebuzz_id?: string;
    refund_amount?: string;
    status?: string;
    [key: string]: any;
}

/** Initiates a full or partial refund against a completed transaction. */
export async function createRefund(params: CreateRefundParams): Promise<EasebuzzRefundResult> {
    const config = resolveConfig(params.environment, params.credentials);
    const refund_amount = formatAmount(params.refundAmount);

    const values = {
        key: config.key,
        merchant_refund_id: params.merchantRefundId,
        easebuzz_id: params.easebuzzId,
        refund_amount,
    };
    const hash = buildRequestHash(["key", "merchant_refund_id", "easebuzz_id", "refund_amount"], values, config.salt);

    return easebuzzRequest(`${dashboardBaseUrl(config.environment)}transaction/v2/refund`, {
        ...values,
        hash,
    });
}

export interface EasebuzzRefundStatus {
    easebuzz_id?: string;
    merchant_refund_id?: string;
    refund_amount?: string;
    status?: string;
    [key: string]: any;
}

/** Checks the status of a previously initiated refund by Easebuzz's `easebuzz_id`. */
export async function getRefundStatus(
    easebuzzId: string,
    environment?: EasebuzzEnvironment,
    credentials?: EasebuzzCredentialOverride,
): Promise<EasebuzzRefundStatus> {
    const config = resolveConfig(environment, credentials);
    const values = { key: config.key, easebuzz_id: easebuzzId };
    const hash = buildRequestHash(["key", "easebuzz_id"], values, config.salt);

    return easebuzzRequest(`${dashboardBaseUrl(config.environment)}refund/v1/retrieve`, {
        ...values,
        hash,
    });
}

// ---------------------------------------------------------------------------
// Response / webhook verification
// ---------------------------------------------------------------------------

const REVERSE_HASH_FIELDS = [
    "status",
    "udf10", "udf9", "udf8", "udf7", "udf6", "udf5", "udf4", "udf3", "udf2", "udf1",
    "email", "firstname", "productinfo", "amount", "txnid", "key",
];

/**
 * Verifies the `hash` field on an Easebuzz payment callback (the POST body
 * Easebuzz sends to `surl`/`furl`, and the payload Easebuzz sends to a
 * configured webhook URL both use this same reverse hash scheme).
 *
 * Reverse hash sequence: SHA-512(salt|status|udf10|...|udf1|email|firstname|
 * productinfo|amount|txnid|key). Returns false (rather than throwing) for
 * a missing/mismatched hash, so callers can treat it as "not verified" and
 * reject the callback without a try/catch.
 */
export function verifyResponseHash(payload: Record<string, unknown>, saltOverride?: string | null): boolean {
    const salt = saltOverride || process.env.EASEBUZZ_SALT;
    if (!salt) {
        throw new Error("Missing Easebuzz salt: set EASEBUZZ_SALT, or pass the merchant's encryption_key.");
    }
    if (!payload || typeof payload.hash !== "string" || !payload.hash) {
        return false;
    }

    const parts = [salt.trim(), ...REVERSE_HASH_FIELDS.map((f) => normalize(payload[f]))];
    const expected = crypto.createHash("sha512").update(parts.join("|")).digest("hex");

    const expectedBuf = Buffer.from(expected.toLowerCase(), "utf8");
    const actualBuf = Buffer.from(payload.hash.toLowerCase(), "utf8");

    // timingSafeEqual throws on length mismatch, so check that separately
    // rather than letting a length difference short-circuit unsafely.
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
