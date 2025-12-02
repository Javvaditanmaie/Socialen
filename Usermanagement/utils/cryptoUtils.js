// src/utils/cryptoUtils.js
import crypto from "crypto";
import { FIELD_ENC_KEY, BLIND_IDX_KEY } from "../config/securityKeys.js";

/**
 * ========================================================
 *                AES-256-GCM Encryption
 * ========================================================
 * Output format:
 * {
 *   iv: "hex-string",
 *   authTag: "hex-string",
 *   encrypted: "hex-string"
 * }
 */

// -------------------- Encrypt Field --------------------
export function encryptField(plainText) {
  if (plainText === undefined || plainText === null) {
    throw new Error("encryptField: plainText cannot be null or undefined");
  }

  const iv = crypto.randomBytes(12); // 12-byte IV for GCM
  const key = Buffer.from(FIELD_ENC_KEY, "hex");

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(String(plainText), "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    iv: iv.toString("hex"),
    authTag,
    encrypted,
  };
}

// -------------------- Decrypt Field --------------------
export function decryptField({ iv, authTag, encrypted }) {
  if (!iv || !authTag || !encrypted) {
    throw new Error("decryptField: Missing required parameters");
  }

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

/**
 * ========================================================
 *              Blind Index (HMAC-SHA256)
 * ========================================================
 * Used for searching encrypted fields (deterministic)
 * Output: hex string (non-reversible)
 */

// -------------------- Generate Blind Index --------------------
export function generateBlindIndex(value) {
  if (!value) return null;

  const normalized = value.toString().trim().toLowerCase();

  return crypto
    .createHmac("sha256", Buffer.from(BLIND_IDX_KEY, "hex"))
    .update(normalized)
    .digest("hex");
}

/**
 * ========================================================
 *        Helper: Encrypt multiple fields at once (optional)
 * ========================================================
 */

export function encryptObjectFields(inputObj, fieldsToEncrypt = []) {
  const output = { ...inputObj };

  for (const field of fieldsToEncrypt) {
    if (!output[field]) continue;

    output[field + "_enc"] = encryptField(output[field]);
    output[field + "_idx"] = generateBlindIndex(output[field]);
    delete output[field]; // Remove plaintext
  }

  return output;
}

/**
 * ========================================================
 *      Helper: Decrypt multiple fields at once (optional)
 * ========================================================
 */

export function decryptObjectFields(objWithEncrypted, fields = []) {
  const output = { ...objWithEncrypted };

  for (const field of fields) {
    const encField = output[field + "_enc"];
    if (encField) {
      output[field] = decryptField(encField);
    }
  }

  return output;
}
