import { NextFunction, Request, Response } from "express";
import { logControllerError } from "../services/loggerService";

export async function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // Multer errors (e.g. LIMIT_FILE_SIZE) don't set statusCode - treat them
    // as client errors so the real reason (file too large, etc.) is returned
    // instead of being masked as a generic 500.
    const isMulterError = err?.name === "MulterError";
    const statusCode = err.statusCode || (isMulterError ? 400 : 500);

    // Catches anything that wasn't already logged by a controller's own
    // try/catch (e.g. errors thrown outside one, or unhandled async
    // rejections that Express 5 forwards here automatically).
    await logControllerError(req, err, "Unknown", "Unknown", statusCode);

    // Don't leak internal error details (stack traces, DB/driver messages,
    // library internals) to the client for unexpected 5xx failures. Known
    // 4xx errors thrown intentionally by our own code still surface their
    // message since that's meant to be user-facing validation/auth feedback.
    const clientMessage =
        statusCode < 500 ? (err.message || "Request failed") : "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        error: clientMessage,
    });
}
