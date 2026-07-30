import { generateKeyPair } from "../utils/generateKeyPair";
import { Request, Response } from "express";
import { logControllerError } from "../services/loggerService";

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
        await logControllerError(req, err, "AdminController", "generateKey");
        res.status(500).json({
            success: false,
            error: "Internal Server Error",
        });
    }
};