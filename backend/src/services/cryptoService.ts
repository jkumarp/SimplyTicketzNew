import crypto from "crypto";
import { getEncryptionKeys } from "../controllers/merchantServicesController";

export async function encryptPayload(
    serviceId: number,
    text: string,
) {
    const keys = await getEncryptionKeys(serviceId);

    return encryptText(keys.publicKey, text);
}

export async function encryptText(publicKey: string, text: string) {
    const encrypted = crypto.publicEncrypt(
        {
            key: publicKey,
            oaepHash: "sha256",
        },
        Buffer.from(text),
    );
    return encrypted.toString("base64");
}

export async function decryptPayload(
    serviceId: number,
    encryptedText: string,
) {
    const keys = await getEncryptionKeys(serviceId);

    return decryptText(keys.privateKey, encryptedText);
}

export async function decryptText(privateKey: string, encryptedText: string) {
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            oaepHash: "sha256",
        },
        Buffer.from(encryptedText, "base64"),
    );

    return decrypted.toString("utf8");
}
export function generateKeyPairSync() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: "spki",
            format: "pem",
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
        },
    });

    return {
        publicKey,
        privateKey,
    };
}
