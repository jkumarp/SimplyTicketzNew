import { NextFunction, Request, Response } from "express";

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

let warnedMissingSecret = false;

/**
 * Verifies the Google reCAPTCHA v2 ("I'm not a robot") token submitted by
 * the Sign In and Merchant Partnership forms, server-side, via Google's
 * siteverify API. Client-side checks alone are trivially bypassable (anyone
 * can call the API directly without a browser), so this is the actual
 * enforcement point.
 *
 * Expects `recaptchaToken` in the (already zod-validated) request body -
 * mount this after `validate(...)` on routes whose schema requires it.
 *
 * If RECAPTCHA_SECRET_KEY isn't configured, verification is skipped (with a
 * one-time warning) so local dev keeps working without needing real Google
 * credentials - mirroring the fail-open behavior the rate limiter already
 * uses when Redis is unavailable. Set the secret to enforce this in any
 * environment that should actually be protected.
 */
export const verifyRecaptcha = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    if (!secret) {
      if (!warnedMissingSecret) {
        console.warn(
          "RECAPTCHA_SECRET_KEY is not set - skipping reCAPTCHA verification. " +
            "Set it in backend/.env before deploying.",
        );
        warnedMissingSecret = true;
      }
      next();
      return;
    }

    const token = req.body?.recaptchaToken;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "reCAPTCHA verification is required" });
      return;
    }

    try {
      const params = new URLSearchParams({ secret, response: token });
      if (req.ip) params.set("remoteip", req.ip);

      const verifyRes = await fetch(RECAPTCHA_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const result = await verifyRes.json();

      if (!result.success) {
        res.status(400).json({ error: "reCAPTCHA verification failed. Please try again." });
        return;
      }

      next();
    } catch (err) {
      console.error("reCAPTCHA verification request failed:", err);
      res.status(502).json({ error: "Could not verify reCAPTCHA. Please try again." });
    }
  };
};
