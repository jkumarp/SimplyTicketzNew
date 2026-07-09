import { generateKeyPair } from "../utils/generateKeyPair";
import { Request, Response } from "express";

export const generateKey = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const keyPair = generateKeyPair();

        res.status(200).json({
            success: true,
            data: keyPair,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Internal Server Error",
        });
    }
};