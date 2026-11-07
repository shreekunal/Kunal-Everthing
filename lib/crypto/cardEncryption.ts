import crypto from "crypto";
import { prisma } from "../prisma";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTED_PREFIX = "enc:v1:";

/**
 * Derives a 32-byte (256-bit) encryption key from the environment JWT_SECRET.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: JWT_SECRET environment variable is missing for card encryption in production."
      );
    }
    return crypto.createHash("sha256").update("kunal-os-dev-card-secret-do-not-use-in-production").digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Checks whether a given string is already in the encrypted ciphertext format.
 */
export function isCardFieldEncrypted(val: string | null | undefined): boolean {
  if (!val || typeof val !== "string") return false;
  return val.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypts a sensitive card field using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<ciphertext_hex>:<authTag_hex>
 */
export function encryptCardField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext.trim() === "") {
    return null;
  }

  const trimmed = plaintext.trim();
  // If already encrypted, do not double encrypt
  if (isCardFieldEncrypted(trimmed)) {
    return trimmed;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(trimmed, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return `${ENCRYPTED_PREFIX}${iv.toString("hex")}:${encrypted}:${authTag}`;
  } catch (err) {
    console.error("Card field encryption error:", err);
    return trimmed;
  }
}

/**
 * Decrypts a card field if encrypted with AES-256-GCM.
 * If plaintext (legacy), returns the plaintext directly for backward compatibility.
 */
export function decryptCardField(ciphertext: string | null | undefined): string | null {
  if (!ciphertext || typeof ciphertext !== "string" || ciphertext.trim() === "") {
    return null;
  }

  const trimmed = ciphertext.trim();
  if (!isCardFieldEncrypted(trimmed)) {
    // Already in plaintext (legacy record)
    return trimmed;
  }

  try {
    const parts = trimmed.slice(ENCRYPTED_PREFIX.length).split(":");
    if (parts.length !== 3) {
      console.warn("Invalid encrypted card field format:", trimmed);
      return trimmed;
    }

    const [ivHex, encryptedHex, authTagHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Card field decryption error:", err);
    return null;
  }
}

/**
 * One-time in-place migration function that scans all existing CreditCard and DebitCard
 * records in the database and encrypts any unencrypted fields in place without data loss.
 */
export async function migrateAndEncryptAllCards(): Promise<{
  creditCardsUpdated: number;
  debitCardsUpdated: number;
}> {
  let creditCardsUpdated = 0;
  let debitCardsUpdated = 0;

  try {
    // 1. Migrate Credit Cards
    const creditCards = await prisma.creditCard.findMany();
    for (const card of creditCards) {
      const needsNumberEnc = card.cardNumber && !isCardFieldEncrypted(card.cardNumber);
      const needsCvvEnc = card.cvv && !isCardFieldEncrypted(card.cvv);
      const needsExpiryEnc = card.expiryDate && !isCardFieldEncrypted(card.expiryDate);

      if (needsNumberEnc || needsCvvEnc || needsExpiryEnc) {
        await prisma.creditCard.update({
          where: { id: card.id },
          data: {
            cardNumber: encryptCardField(card.cardNumber),
            cvv: encryptCardField(card.cvv),
            expiryDate: encryptCardField(card.expiryDate),
          },
        });
        creditCardsUpdated++;
      }
    }

    // 2. Migrate Debit Cards
    const debitCards = await prisma.debitCard.findMany();
    for (const card of debitCards) {
      const needsNumberEnc = card.cardNumber && !isCardFieldEncrypted(card.cardNumber);
      const needsCvvEnc = card.cvv && !isCardFieldEncrypted(card.cvv);
      const needsExpiryEnc = card.expiryDate && !isCardFieldEncrypted(card.expiryDate);

      if (needsNumberEnc || needsCvvEnc || needsExpiryEnc) {
        await prisma.debitCard.update({
          where: { id: card.id },
          data: {
            cardNumber: encryptCardField(card.cardNumber),
            cvv: encryptCardField(card.cvv),
            expiryDate: encryptCardField(card.expiryDate),
          },
        });
        debitCardsUpdated++;
      }
    }
  } catch (err) {
    console.error("Failed to migrate existing cards to encrypted format:", err);
  }

  return { creditCardsUpdated, debitCardsUpdated };
}
