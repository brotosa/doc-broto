import "server-only";

// Helpers de sessão para uso em Server Components e Route Handlers (runtime Node).
import { cookies } from "next/headers";
import { SESSION_COOKIE, signSession, verifySession, type SessionUser } from "./session";
import { getSessionPolicy, sessionWindowSec } from "./session-policy";

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

// Grava (ou renova) o cookie de sessão usando a janela de inatividade atual.
// Chamado no login e no "heartbeat" (/api/session) enquanto o usuário está ativo.
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const { idleMinutes } = await getSessionPolicy();
  const maxAge = sessionWindowSec(idleMinutes);
  const token = await signSession(user, maxAge);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Só marca Secure quando o site é servido por HTTPS (COOKIE_SECURE=true).
    // Em HTTP puro (acesso por IP), Secure faria o navegador descartar o cookie.
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
