import fs from "fs";
import crypto from "crypto";
function generateHexKey(filename){
    const key=crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(filename,key);
    console.log(`${filename} created`)
}
generateHexKey("field_enc_key.hex")
generateHexKey("blind_idx_key.hex")