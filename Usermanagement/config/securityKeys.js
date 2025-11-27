//load these keys into your app
import fs from "fs";
import path from "path";
const basePath=path.resolve("config/keys");

// load aes encryption key(32 bytes hex)
export const FIELD_ENC_KEY=fs
.readFileSync(path.join(basePath,"field_enc_key.hex"),"utf8")
.trim()
// Load Blind Index Key (HMAC key)
export const BLIND_IDX_KEY = fs
  .readFileSync(path.join(basePath, "blind_idx_key.hex"), "utf8")
  .trim();