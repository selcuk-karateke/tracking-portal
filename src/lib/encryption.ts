import {
  createDecipheriv,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

function getMasterKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY muss in der Umgebung gesetzt sein (mind. 32 Zeichen).",
    );
  }
  return key;
}

function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return scryptSync(masterKey, salt, KEY_LENGTH);
}

export function decrypt(ciphertext: string): string {
  const masterKey = getMasterKey();
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new Error("Ungültiges verschlüsseltes Format.");
  }

  const salt = buf.subarray(0, SALT_LENGTH);
  const iv = buf.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buf.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
  );
  const encrypted = buf.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(masterKey, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

export function isEncrypted(value: string): boolean {
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}
