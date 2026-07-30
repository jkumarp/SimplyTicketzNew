import { NextFunction, Request, Response } from "express";
import * as jose from "jose";
import dotenv from "dotenv";
import { JwtPayload } from "@supabase/supabase-js";

dotenv.config();

const jweSecret = new TextEncoder().encode(process.env.JWE_SECRET);
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);
interface JWTPayload extends jose.JWTPayload {
  user_id: number;
  merchant_id: number;
  role: number;
  email: string;
}
export const authorizeRoles = (...roles: number[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized: No token provided" });
        return;
      }

      const token = authHeader.split(" ")[1];
      const { plaintext } = await jose.compactDecrypt(token, jweSecret);
      const { payload } = await jose.jwtVerify(plaintext, jwtSecret, {
        issuer: "simplyticketz",
        audience: "merchant-portal",
      });
      const verified = payload as JwtPayload;
      //const payload = JSON.parse(new TextDecoder().decode(plaintext));

      if (!roles.includes(parseInt(verified.role))) {
        res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        return;
      }

      (req as any).user = payload;
      next();
    } catch (err) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }
  };
};
