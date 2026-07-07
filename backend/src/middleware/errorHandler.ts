import { NextFunction, Request, Response } from "express";
import { logError } from "../services/loggerService";

export async function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        await logError({
            level: "ERROR",
            module: "Unknown",
            function_name: "Unknown",

            merchant_id: (req as any).user?.merchant_id,
            user_id: (req as any).user?.user_id,
            request_id: (req as any).requestId,

            method: req.method,
            endpoint: req.originalUrl,
            ip_address: req.ip,

            status_code: err.statusCode || 500,

            error_message: err.message,

            stack_trace: err.stack,

            request_body: req.body,
            request_query: req.query,
            request_params: req.params,
        });
    } catch (logError) {
        console.error("Failed to write error log:", logError);
    }

    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Internal Server Error",
    });
}
