"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Hex = sha256Hex;
const crypto_1 = require("crypto");
/** Deterministic SHA-256 over a UTF-8 string, returned as lowercase hex. */
function sha256Hex(input) {
    return (0, crypto_1.createHash)("sha256").update(input, "utf8").digest("hex");
}
