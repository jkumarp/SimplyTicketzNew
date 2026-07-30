// services/loggerService.ts

import { Request } from "express";
import { supabase } from "../config/supabase";

// Fields that should never be written to logs in plaintext, even on error.
const SENSITIVE_FIELDS = [
    "password",
    "token",
    "secret",
    "secret_key",
    "secret_value",
    "ticket_encryption_key",
    "private_key",
    "authorization",
];

export const redact = (value: any): any => {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object") {
        const clone: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
            clone[key] = SENSITIVE_FIELDS.includes(key.toLowerCase())
                ? "[REDACTED]"
                : redact(val);
        }
        return clone;
    }
    return value;
};

export async function logError(data: {
    level: string;
    module?: string;
    function_name?: string;
    merchant_id?: number;
    user_id?: number;
    request_id?: string;
    method?: string;
    endpoint?: string;
    ip_address?: string;
    status_code?: number;
    error_message: string;
    stack_trace?: string;
    request_body?: any;
    request_query?: any;
    request_params?: any;
    supabase_error?: any;
    execution_time_ms?: number;
}): Promise<void> {

    // supabase-js never throws for a PostgREST-level failure (schema not
    // exposed, permissions, a bad row shape, ...) - it resolves with
    // `{ data: null, error }` instead. Previously that `error` was never
    // read, so a failed insert here looked identical to a successful one:
    // callers' own try/catch around logError() never fired, and the
    // failure vanished with zero trace. Surface it to stderr at minimum so
    // "why isn't anything showing up in audit.error_log" is answerable
    // from the server logs instead of invisible.
    const { error } = await supabase
        .schema("audit")
        .from("error_log")
        .insert(data);

    if (error) {
        console.error("[loggerService] Failed to write to audit.error_log:", error, "\nOriginal log payload:", data);
    }
}

/**
 * Logs an exception caught inside a controller's try/catch to
 * audit.error_log, using the same shape/redaction as the global
 * errorHandler middleware. Controllers keep returning their own response
 * (400/500/etc.) after calling this - it never throws, so a logging
 * failure can't break the request.
 *
 * `module` is typically the controller name (e.g. "TicketController") and
 * `functionName` the exported handler that caught the error (e.g.
 * "createTicket"), so log rows can be traced back to the code that raised
 * them.
 */
export async function logControllerError(
    req: Request,
    err: any,
    module: string,
    functionName: string,
    statusCode = 500,
): Promise<void> {
    try {
        await logError({
            level: "ERROR",
            module,
            function_name: functionName,

            merchant_id: (req as any).user?.merchant_id,
            user_id: (req as any).user?.user_id,
            request_id: (req as any).requestId,

            method: req.method,
            endpoint: req.originalUrl,
            ip_address: req.ip,

            status_code: statusCode,

            error_message: err?.message || "Unknown error",

            stack_trace: err?.stack,

            request_body: redact(req.body),
            request_query: redact(req.query),
            request_params: redact(req.params),
        });
    } catch (logErr) {
        console.error("Failed to write error log:", logErr);
    }
}
