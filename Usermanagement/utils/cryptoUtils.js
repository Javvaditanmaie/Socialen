import crypto from "crypto";
import { FIELD_ENC_KEY, BLIND_IDX_KEY } from "../config/securityKeys.js";

// -------------------- AES-256-GCM Encryption --------------------
export function encryptField(plainText) {
  const iv = crypto.randomBytes(12); // GCM requires 12-byte IV
  const key = Buffer.from(FIELD_ENC_KEY, "hex");

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    iv: iv.toString("hex"),
    authTag,
    encrypted,
  };
}

// -------------------- AES-256-GCM Decryption --------------------
export function decryptField({ iv, authTag, encrypted }) {
  const key = Buffer.from(FIELD_ENC_KEY, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// -------------------- Blind Index (HMAC-SHA256) --------------------
export function generateBlindIndex(value) {
  return crypto
    .createHmac("sha256", Buffer.from(BLIND_IDX_KEY, "hex"))
    .update(value.toLowerCase().trim())
    .digest("hex");
}
