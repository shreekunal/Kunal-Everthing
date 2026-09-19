import { SignJWT, jwtVerify } from "jose";

export const TOKEN_COOKIE_NAME = "kunal_os_token";
export const JWT_ISSUER = "kunal-os";
export const JWT_AUDIENCE = "kunal-os-users";

/**
 * Retrieves the cryptographic key for JWT signing & verification.
 * Enforces production safety: in production, JWT_SECRET must be explicitly set and >= 32 characters.
 */
export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: JWT_SECRET environment variable is missing in production. Authentication halted."
      );
    }
    // Only in local development if unset
    return new TextEncoder().encode("kunal-os-dev-jwt-secret-do-not-use-in-production-0123456789");
  }

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      "FATAL: JWT_SECRET must be at least 32 characters long in production."
    );
  }

  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  authMethod: string;
}

/**
 * Issues a cryptographically signed JWT session token with standard RFC 7519 claims.
 */
export async function createSessionToken(
  userId: string,
  email: string,
  authMethod: string = "pin"
): Promise<string> {
  const secretKey = getJwtSecretKey();

  return await new SignJWT({
    userId,
    email,
    authMethod,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(userId)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

/**
 * Strictly verifies a session JWT token.
 * Returns decoded session payload or null if invalid, tampered, or expired.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (!payload.userId || typeof payload.userId !== "string") {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: (payload.email as string) || "",
      authMethod: (payload.authMethod as string) || "pin",
    };
  } catch {
    // Graceful backward compatibility for active tokens signed before issuer/audience were enforced
    try {
      const secretKey = getJwtSecretKey();
      const { payload } = await jwtVerify(token, secretKey);
      if (payload.userId && typeof payload.userId === "string") {
        return {
          userId: payload.userId as string,
          email: (payload.email as string) || "",
          authMethod: (payload.authMethod as string) || "pin",
        };
      }
    } catch {
      // Signature mismatch, corrupted, or expired token
    }
    return null;
  }
}
