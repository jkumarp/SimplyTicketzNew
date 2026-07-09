import crypto from "crypto";
import {
    getEncryptionKeys
} from "../controllers/merchantServicesController";

export async function encryptPayload(
    serviceId: number,
    text: string,
) {
    const keys = await getEncryptionKeys(serviceId);

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
    serviceId: number,
    encrypted: string,
) {
    const keys = await getEncryptionKeys(serviceId);

    const decrypted = crypto.privateDecrypt(
        {
            key: keys.privateKey,
            oaepHash: "sha256",
        },
        Buffer.from(encrypted, "base64"),
    );

    return decrypted.toString("utf8");
}

export function generateKeyPairSync(){
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