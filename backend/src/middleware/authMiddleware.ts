import { Request, Response, NextFunction } from 'express';
import * as jose from 'jose';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '12345678123456781234567812345678');

export const authorizeRoles = (allowedRoles: number[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
      }

      const token = authHeader.split(' ')[1];
      const { plaintext } = await jose.compactDecrypt(token, SECRET);
      const payload = JSON.parse(new TextDecoder().decode(plaintext));
      
      if (!allowedRoles.includes(payload.role)) {
        res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        return;
      }

      (req as any).user = payload;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
  };
};