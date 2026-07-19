import { PrivateKey, PublicKey, encrypt, decrypt } from "eciesjs";

export function generateKeyPairSync() {
    const privateKeyValue = new PrivateKey();
    const publicKey = privateKeyValue.publicKey.toHex();
    const privateKey = privateKeyValue.toHex();
    return {
        publicKey,
        privateKey,
    };
}

export async function encryptText(publicKey: string, text: string) {
    const receiverPublicKey = PublicKey.fromHex(publicKey);
    const encryptedText = encrypt(receiverPublicKey.toBytes(),  Buffer.from(text));
    return encryptText;
}

export async function decryptText(privateKey: string, encryptedText: string) {
    const decrypted = decrypt(Buffer.from(privateKey, "hex"), Buffer.from(encryptedText, "base64"));
    return decrypted.toString();
}
