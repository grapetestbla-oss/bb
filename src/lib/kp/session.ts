import crypto from "crypto";
import { cookies } from "next/headers";

export const KP_SESSION_COOKIE = "kp_session";

const SESSION_TTL_DAYS = 30;

/**
 * Секрет для подписи сессионной куки. В проде задаётся через KP_SESSION_SECRET;
 * в dev поднимаем эфемерный — при рестарте сессии просто инвалидируются.
 */
const SECRET =
  process.env.KP_SESSION_SECRET ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "kp-dev-secret-not-for-production");

if (!SECRET) {
  console.warn(
    "[kp] KP_SESSION_SECRET не задан — сессии KPGen работать не будут",
  );
}

interface SessionPayload {
  uid: string;
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    uid: userId,
    exp: Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token || !SECRET) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  // timingSafeEqual падает на разной длине — сравниваем её отдельно.
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.uid || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(KP_SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(KP_SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return readSessionToken(store.get(KP_SESSION_COOKIE)?.value);
}
