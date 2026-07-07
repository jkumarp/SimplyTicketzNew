import crypto from "crypto";
import {
    getKeys
} from "../controllers/merchantController";

export async function encryptPayload(
    merchantId: number,
    text: string,
) {
    const keys = await getKeys(merchantId);

    const encrypted = crypto.publicEncrypt(
        {
            key: keys.publicKey,
            oaepHash: "sha256",
        },
        Buffer.from(text),
    );

    return encrypted.toString("base64");
}

export async function decryptPayload(
    merchantId: number,
    encrypted: string,
) {
    const keys = await getKeys(merchantId);

    const decrypted = crypto.privateDecrypt(
        {
            key: keys.privateKey,
            oaepHash: "sha256",
        },
        Buffer.from(encrypted, "base64"),
    );

    return decrypted.toString("utf8");
}



