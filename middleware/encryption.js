const crypto = require("crypto");
const ALGO   = "aes-256-cbc";
const SECRET = process.env.ENCRYPTION_SECRET || "ghostchat-default-secret-change-me";
const KEY    = crypto.scryptSync(SECRET, "ghostsalt", 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encrypted, iv:iv.toString("hex") };
}

function decrypt(encrypted, ivHex) {
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };