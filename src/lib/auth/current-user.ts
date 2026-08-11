import "server-only";

// Helpers de sessão para uso em Server Components e Route Handlers (runtime Node).
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionUser } from "./session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
