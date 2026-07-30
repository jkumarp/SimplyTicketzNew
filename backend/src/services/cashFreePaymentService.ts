// services/paymentService.ts
//
// Cashfree Payment Gateway integration (Orders API).
//
// Wraps order creation/lookup, payment lookup, refunds, and webhook
// signature verification behind a small set of functions. Credentials are
// read from environment variables lazily (inside each call), so a server
// without Cashfree configured can still boot - it only fails when a
// payment operation is actually attempted:
//
//   CASHFREE_APP_ID      - Cashfree client ID
//   CASHFREE_SECRET_KEY  - Cashfree client secret
//   CASHFREE_API_VERSION - API version header, defaults to '2023-08-01'
//   CASHFREE_ENV         - 'SANDBOX' | 'PRODUCTION', defaults to 'SANDBOX'
//                          (only used when a call doesn't specify its own
//                          environment - see toCashfreeEnvironment below)
//
// Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint

import crypto from "crypto";

const DEFAULT_API_VERSION = "2023-08-01";

const SANDBOX_BASE_URL = "https://sandbox.cashfree.com/pg";
const PRODUCTION_BASE_URL = "https://api.cashfree.com/pg";

export type CashfreeEnvironment = "SANDBOX" | "PRODUCTION";

export interface CashfreeConfig {
    appId: string;
    secretKey: string;
    apiVersion: string;
    environment: CashfreeEnvironment;
}

/**
 * Thrown for any non-2xx response from Cashfree. `details` carries the raw
 * parsed error body so callers can inspect Cashfree's `type`/`code` fields
 * without this module needing to know about every error shape.
 */
export class CashfreeApiError extends Error {
    status: number;
    code?: string;
    details?: any;

    constructor(message: string, status: number, code?: string, details?: any) {
        super(message);
        this.name = "CashfreeApiError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

/**
 * Maps `merchant_payment_gateway_mapping.environment` ('PROD', 'TEST',
 * 'UAT', 'SANDBOX', ...) onto Cashfree's own two-environment model.
 * Anything other than 'PROD' is treated as sandbox, so test/staging traffic
 * never accidentally hits Cashfree's production endpoint.
 */
export function toCashfreeEnvironment(mappingEnvironment?: string | null): CashfreeEnvironment {
    return mappingEnvironment?.trim().toUpperCase() === "PROD" ? "PRODUCTION" : "SANDBOX";
}

/**
 * Merchant-specific override for the Cashfree client id/secret, sourced from
 * `merchant_payment_gateway_mapping.api_id` / `.encryption_key`. When not
 * supplied, falls back to the platform-wide CASHFREE_APP_ID/SECRET_KEY env
 * vars, so single-tenant/dev setups keep working unchanged.
 */
export interface CashfreeCredentialOverride {
    appId?: string | null;
    secretKey?: string | null;
}

function resolveConfig(
    environment?: CashfreeEnvironment,
    overrides?: CashfreeCredentialOverride,
): CashfreeConfig {
    const appId = overrides?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = overrides?.secretKey || process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secretKey) {
        throw new Error("Missing Cashfree credentials: configure CASHFREE_APP_ID / CASHFREE_SECRET_KEY, or set api_id / encryption_key on the merchant's payment gateway mapping.");
    }

    return {
        appId,
        secretKey,
        apiVersion: process.env.CASHFREE_API_VERSION || DEFAULT_API_VERSION,
        environment: environment ?? (process.env.CASHFREE_ENV === "PRODUCTION" ? "PRODUCTION" : "SANDBOX"),
    };
}

function baseUrlFor(environment: CashfreeEnvironment): string {
    return environment === "PRODUCTION" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

async function cashfreeRequest<T>(
    path: string,
    options: {
        method?: string;
        body?: any;
        environment?: CashfreeEnvironment;
        idempotencyKey?: string;
        credentials?: CashfreeCredentialOverride;
    } = {},
): Promise<T> {
    const config = resolveConfig(options.environment, options.credentials);
    const url = `${baseUrlFor(config.environment)}${path}`;

    let res: Response;
    try {
        res = await fetch(url, {
            method: options.method ?? "GET",
            headers: {
                "Content-Type": "application/json",
                "x-client-id": config.appId,
                "x-client-secret": config.secretKey,
                "x-api-version": config.apiVersion,
                ...(options.idempotencyKey ? { "x-idempotency-key": options.idempotencyKey } : {}),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });
    } catch (err: any) {
        throw new CashfreeApiError(
            `Failed to reach Cashfree: ${err?.message || "network error"}`,
            0,
            "NETWORK_ERROR",
        );
    }

    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : {};

    if (!res.ok) {
        throw new CashfreeApiError(
            data?.message || `Cashfree request failed with status ${res.status}`,
            res.status,
            data?.code,
            data,
        );
    }

    return data as T;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface CashfreeCustomerDetails {
    customer_id: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone: string;
}

export interface CreateOrderParams {
    /** Merchant-side unique order id, also used as the idempotency key. */
    orderId: string;
    orderAmount: number;
    orderCurrency?: string;
    customer: CashfreeCustomerDetails;
    /** Where Cashfree redirects the customer's browser after checkout. */
    returnUrl?: string;
    /** Cashfree's server-to-server webhook URL for this order. */
    notifyUrl?: string;
    orderNote?: string;
    environment?: CashfreeEnvironment;
    /** Merchant-specific credentials (from merchant_payment_gateway_mapping); falls back to env vars when omitted. */
    credentials?: CashfreeCredentialOverride;
}

export interface CashfreeOrderResponse {
    cf_order_id: string;
    order_id: string;
    order_status: string;
    order_amount: number;
    order_currency: string;
    /** Hand this to the Cashfree JS SDK on the client to launch checkout. */
    payment_session_id: string;
    order_expiry_time?: string;
    [key: string]: any;
}

/**
 * Creates a Cashfree order and returns the `payment_session_id` the
 * frontend needs to launch checkout (via Cashfree's `cashfree.checkout()`
 * JS SDK, or the hosted payment link if preferred).
 */
export async function createOrder(params: CreateOrderParams): Promise<CashfreeOrderResponse> {
    const {
        orderId,
        orderAmount,
        orderCurrency = "INR",
        customer,
        returnUrl,
        notifyUrl,
        orderNote,
        environment,
        credentials,
    } = params;

    return cashfreeRequest<CashfreeOrderResponse>("/orders", {
        method: "POST",
        environment,
        idempotencyKey: orderId,
        credentials,
        body: {
            order_id: orderId,
            order_amount: orderAmount,
            order_currency: orderCurrency,
            customer_details: customer,
            order_meta: {
                ...(returnUrl ? { return_url: returnUrl } : {}),
                ...(notifyUrl ? { notify_url: notifyUrl } : {}),
            },
            ...(orderNote ? { order_note: orderNote } : {}),
        },
    });
}

export async function getOrder(
    orderId: string,
    environment?: CashfreeEnvironment,
    credentials?: CashfreeCredentialOverride,
): Promise<CashfreeOrderResponse> {
    return cashfreeRequest<CashfreeOrderResponse>(`/orders/${encodeURIComponent(orderId)}`, { environment, credentials });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface CashfreePayment {
    cf_payment_id: number | string;
    order_id: string;
    payment_status: "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED" | "NOT_ATTEMPTED" | "CANCELLED" | string;
    payment_amount: number;
    payment_currency: string;
    payment_method?: any;
    payment_time?: string;
    [key: string]: any;
}

/** Lists every payment attempt made against an order. */
export async function getOrderPayments(
    orderId: string,
    environment?: CashfreeEnvironment,
    credentials?: CashfreeCredentialOverride,
): Promise<CashfreePayment[]> {
    return cashfreeRequest<CashfreePayment[]>(`/orders/${encodeURIComponent(orderId)}/payments`, { environment, credentials });
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export interface CreateRefundParams {
    orderId: string;
    /** Merchant-side unique refund id, also used as the idempotency key. */
    refundId: string;
    refundAmount: number;
    refundNote?: string;
    environment?: CashfreeEnvironment;
    credentials?: CashfreeCredentialOverride;
}

export interface CashfreeRefundResponse {
    cf_refund_id: number | string;
    refund_id: string;
    order_id: string;
    refund_status: "SUCCESS" | "PENDING" | "FAILED" | string;
    refund_amount: number;
    [key: string]: any;
}

export async function createRefund(params: CreateRefundParams): Promise<CashfreeRefundResponse> {
    const { orderId, refundId, refundAmount, refundNote, environment, credentials } = params;

    return cashfreeRequest<CashfreeRefundResponse>(`/orders/${encodeURIComponent(orderId)}/refunds`, {
        method: "POST",
        environment,
        idempotencyKey: refundId,
        credentials,
        body: {
            refund_id: refundId,
            refund_amount: refundAmount,
            ...(refundNote ? { refund_note: refundNote } : {}),
        },
    });
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/**
 * Verifies a Cashfree webhook's signature.
 *
 * Cashfree HMAC-SHA256-signs `timestamp + rawRequestBody` with the client
 * secret and base64-encodes the digest, sending it as `x-webhook-signature`
 * alongside `x-webhook-timestamp`. `rawBody` MUST be the exact bytes
 * Cashfree sent (e.g. via `express.raw()` on the webhook route, read before
 * any JSON body-parsing middleware) - re-serializing a parsed JSON object
 * can produce different bytes and will always fail verification.
 */
export function verifyWebhookSignature(
    rawBody: string,
    signature: string,
    timestamp: string,
    secretKeyOverride?: string | null,
): boolean {
    const secretKey = secretKeyOverride || process.env.CASHFREE_SECRET_KEY;
    if (!secretKey) {
        throw new Error("Missing Cashfree secret key: set CASHFREE_SECRET_KEY, or pass the merchant's encryption_key.");
    }
    if (!signature || !timestamp) {
        return false;
    }

    const expected = crypto
        .createHmac("sha256", secretKey)
        .update(timestamp + rawBody)
        .digest("base64");

    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);

    // timingSafeEqual throws on length mismatch, so check that separately
    // rather than letting a length difference short-circuit unsafely.
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
