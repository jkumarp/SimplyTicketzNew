// services/paymentServices.ts
//
// Decides which payment gateway a merchant's online checkout should use,
// and dispatches the actual checkout-session creation to the matching
// gateway-specific service (cashFreePaymentService / easeBuzzPaymentService).
//
// The routing decision is driven entirely by `master.merchant_payment_gateway_mapping`
// (see controllers/merchantPGMappingController.ts for the CRUD surface on
// that table) joined to `master.payment_gateway` for the gateway's code -
// there is no separate "which gateway" config anywhere else. Each mapping
// row also carries the merchant's own gateway credentials (`api_id` /
// `encryption_key`), so a single deployment can route different merchants
// to different Cashfree/Easebuzz accounts.

import { supabase } from "../config/supabase.ts";
import * as cashfree from "./cashFreePaymentService";
import * as easebuzz from "./easeBuzzPaymentService";

const MAPPING_TABLE = "merchant_payment_gateway_mapping";

export class PaymentGatewayError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PaymentGatewayError";
    this.status = status;
  }
}

export interface ResolvedGatewayMapping {
  id: number;
  merchant_id: number;
  gateway_id: number;
  payment_method: string | null;
  currency: string | null;
  environment: string | null;
  api_id: string | null;
  encryption_key: string | null;
  success_url: string | null;
  failure_url: string | null;
  cancel_url: string | null;
  webhook_url: string | null;
}

export interface ResolvedGateway {
  mapping: ResolvedGatewayMapping;
  gateway: {
    id: number;
    gateway_name: string;
    gateway_code: string;
  };
}

/**
 * Decides which payment gateway should handle an online payment for a given
 * merchant. Looks up every active, currently-effective mapping row for the
 * merchant (optionally narrowed by payment method / currency), and picks the
 * best match: the mapping flagged `is_default`, else the lowest `priority`.
 *
 * Throws PaymentGatewayError (400) when the merchant has no usable mapping,
 * or when the mapped gateway itself is disabled - both are configuration
 * problems the merchant/admin needs to fix via the PG mapping screen, not
 * something the caller can recover from.
 */
export async function decidePaymentGateway(
  merchantId: number,
  opts: { paymentMethod?: string; currency?: string } = {},
): Promise<ResolvedGateway> {
  const nowIso = new Date().toISOString();

  const query = supabase
    .schema("master")
    .from(MAPPING_TABLE)
    .select("*, payment_gateway:gateway_id(id, gateway_name, gateway_code, status)")
    .eq("merchant_id", merchantId)
    .eq("is_active", true)
    .or(`effective_from.is.null,effective_from.lte.${nowIso}`)
    .or(`effective_to.is.null,effective_to.gte.${nowIso}`);

  const { data, error } = await query
    .order("is_default", { ascending: false })
    .order("priority", { ascending: true });

  if (error) {
    throw new PaymentGatewayError(`Failed to resolve payment gateway: ${error.message}`, 500);
  }

  const candidates = (data || []).filter((row: any) => {
    if (!row.payment_gateway || row.payment_gateway.status === false) return false;
    if (opts.paymentMethod && row.payment_method && row.payment_method !== "ALL") {
      if (row.payment_method.toUpperCase() !== opts.paymentMethod.toUpperCase()) return false;
    }
    if (opts.currency && row.currency && row.currency.trim().toUpperCase() !== opts.currency.toUpperCase()) {
      return false;
    }
    return true;
  });

  const best = candidates[0];
  if (!best) {
    throw new PaymentGatewayError(
      `No active payment gateway is configured for merchant #${merchantId}. Add a mapping under Payment Gateway Mappings.`,
    );
  }

  const { payment_gateway, ...mapping } = best;

  return {
    mapping: mapping as ResolvedGatewayMapping,
    gateway: {
      id: payment_gateway.id,
      gateway_name: payment_gateway.gateway_name,
      gateway_code: (payment_gateway.gateway_code || "").toUpperCase(),
    },
  };
}

export interface InitiateGatewayPaymentParams {
  merchantId: number;
  invoiceId: number | string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  /** Frontend origin the customer should land back on, e.g. https://app.example.com */
  frontendOrigin: string;
  /** This API's own base URL, e.g. https://api.example.com/api - used for gateway-hosted callback endpoints (Easebuzz surl/furl). */
  backendBaseUrl: string;
}

export type GatewayCheckout =
  | {
      gatewayCode: "CASHFREE";
      gatewayName: string;
      orderId: string;
      paymentSessionId: string;
      environment: cashfree.CashfreeEnvironment;
    }
  | {
      gatewayCode: "EASEBUZZ";
      gatewayName: string;
      txnid: string;
      accessKey: string;
      paymentUrl: string;
    };

/**
 * Resolves the merchant's payment gateway and creates a checkout
 * session/link against it. The frontend is expected to redirect the
 * customer's browser using whatever the returned shape provides
 * (Cashfree's `payment_session_id` via their JS SDK, or Easebuzz's
 * `paymentUrl` via a plain redirect).
 */
export async function initiateGatewayPayment(params: InitiateGatewayPaymentParams): Promise<GatewayCheckout> {
  const { merchantId, invoiceId, amount, currency, paymentMethod, customer, frontendOrigin, backendBaseUrl } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentGatewayError("Payment amount must be a positive number.");
  }

  const { mapping, gateway } = await decidePaymentGateway(merchantId, { paymentMethod, currency });
  const resultUrl = `${frontendOrigin.replace(/\/$/, "")}/payment-result/${invoiceId}`;

  switch (gateway.gateway_code) {
    case "CASHFREE": {
      const orderId = `INV${invoiceId}${Date.now()}`;
      const order = await cashfree.createOrder({
        orderId,
        orderAmount: amount,
        orderCurrency: currency || mapping.currency?.trim() || "INR",
        customer: {
          customer_id: `CUST-${invoiceId}`,
          customer_name: customer.name,
          customer_email: customer.email || undefined,
          customer_phone: customer.phone,
        },
        // Cashfree substitutes the literal `{order_id}` placeholder with the
        // real order id before redirecting the customer's browser back.
        returnUrl: `${resultUrl}?gateway=CASHFREE&order_id={order_id}`,
        notifyUrl: mapping.webhook_url || undefined,
        orderNote: `Invoice #${invoiceId}`,
        environment: cashfree.toCashfreeEnvironment(mapping.environment),
        credentials: { appId: mapping.api_id, secretKey: mapping.encryption_key },
      });

      if (!order.payment_session_id) {
        throw new PaymentGatewayError("Cashfree did not return a payment session.", 502);
      }

      return {
        gatewayCode: "CASHFREE",
        gatewayName: gateway.gateway_name,
        orderId: order.order_id,
        paymentSessionId: order.payment_session_id,
        environment: cashfree.toCashfreeEnvironment(mapping.environment),
      };
    }

    case "EASEBUZZ": {
      const txnid = `INV${invoiceId}${Date.now()}`.slice(0, 40);
      // Easebuzz POSTs the payment result to surl/furl (it can't hit a SPA
      // route directly - there's nothing there to read the POST body), so
      // both point at a backend endpoint which verifies the hash and then
      // 302s the browser on to the frontend result page.
      const returnBase = `${backendBaseUrl.replace(/\/$/, "")}/payments/easebuzz-return`;

      const result = await easebuzz.initiatePayment({
        txnid,
        amount,
        firstname: customer.name || "Guest",
        email: customer.email || "guest@simplyticketz.com",
        phone: customer.phone,
        productinfo: `Invoice #${invoiceId}`,
        surl: returnBase,
        furl: returnBase,
        udf1: String(invoiceId),
        udf2: String(merchantId),
        environment: easebuzz.toEasebuzzEnvironment(mapping.environment),
        credentials: { key: mapping.api_id, salt: mapping.encryption_key },
      });

      return {
        gatewayCode: "EASEBUZZ",
        gatewayName: gateway.gateway_name,
        txnid,
        accessKey: result.accessKey,
        paymentUrl: result.paymentUrl,
      };
    }

    default:
      throw new PaymentGatewayError(
        `Online checkout via "${gateway.gateway_name}" (${gateway.gateway_code}) is not supported yet.`,
      );
  }
}

export interface VerifyGatewayPaymentParams {
  merchantId: number;
  gatewayCode: string;
  /** Cashfree order id (required for CASHFREE). */
  orderId?: string;
  /** Easebuzz txnid (required for EASEBUZZ). */
  txnid?: string;
}

export interface VerifyGatewayPaymentResult {
  paid: boolean;
  rawStatus?: string;
}

/**
 * Re-checks a payment's status directly against the gateway (never trusts
 * client-supplied "it succeeded" query params on their own) so the caller
 * can decide whether to flip the invoice's tickets to CONFIRMED.
 */
export async function verifyGatewayPayment(params: VerifyGatewayPaymentParams): Promise<VerifyGatewayPaymentResult> {
  const { merchantId, gatewayCode, orderId, txnid } = params;
  const { mapping } = await decidePaymentGateway(merchantId);

  switch (gatewayCode.toUpperCase()) {
    case "CASHFREE": {
      if (!orderId) throw new PaymentGatewayError("orderId is required to verify a Cashfree payment.");
      const payments = await cashfree.getOrderPayments(
        orderId,
        cashfree.toCashfreeEnvironment(mapping.environment),
        { appId: mapping.api_id, secretKey: mapping.encryption_key },
      );
      const success = payments.find((p) => p.payment_status === "SUCCESS");
      return { paid: !!success, rawStatus: success?.payment_status || payments[0]?.payment_status };
    }

    case "EASEBUZZ": {
      if (!txnid) throw new PaymentGatewayError("txnid is required to verify an Easebuzz payment.");
      const txn = await easebuzz.getTransaction(
        txnid,
        easebuzz.toEasebuzzEnvironment(mapping.environment),
        { key: mapping.api_id, salt: mapping.encryption_key },
      );
      const status = (txn.status || "").toString().toLowerCase();
      return { paid: status === "success", rawStatus: txn.status };
    }

    default:
      throw new PaymentGatewayError(`Cannot verify payments for gateway "${gatewayCode}".`);
  }
}
