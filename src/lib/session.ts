import type { AstroCookies } from "astro";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "neo_session";

function signingSecret(): string {
  const secret = process.env.SESSION_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SIGNING_SECRET must contain at least 32 characters");
  }
  return secret;
}

function signature(sessionId: string): string {
  return createHmac("sha256", signingSecret())
    .update(sessionId)
    .digest("base64url");
}

function verifySignature(sessionId: string, actual: string): boolean {
  const expected = Buffer.from(signature(sessionId));
  const received = Buffer.from(actual);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function readSessionId(cookies: AstroCookies): string | null {
  const value = cookies.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const [version, sessionId, actualSignature] = value.split(".");
  if (
    version !== "v1" ||
    !sessionId ||
    !actualSignature ||
    !/^[0-9a-f-]{36}$/i.test(sessionId)
  ) {
    return null;
  }
  return verifySignature(sessionId, actualSignature) ? sessionId : null;
}

export function getOrCreateSessionId(
  cookies: AstroCookies,
  requestUrl: string,
): string {
  const existing = readSessionId(cookies);
  if (existing) return existing;

  const sessionId = randomUUID();
  cookies.set(COOKIE_NAME, `v1.${sessionId}.${signature(sessionId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(requestUrl).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return sessionId;
}
