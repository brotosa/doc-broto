// Sessão do app (independente do Firebase): um JWT curto e httpOnly que assinamos
// com AUTH_SECRET. O Firebase valida a senha; aqui controlamos o acesso ao app.
// Este arquivo NÃO importa next/headers, então roda também no middleware (Edge).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "broto_session";
export const SESSION_MAX_AGE = 60 * 60 * 4; // 4 horas (padrão)
// Janela usada quando o timeout por inatividade está desligado (idle = 0).
export const SESSION_ABSOLUTE_FALLBACK = 60 * 60 * 12; // 12 horas

export type Role = "admin" | "comum";
export type SessionUser = {
  uid: string;
  email: string;
  name: string;
  role: Role;
  mustChange: boolean;
};

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-insecure-secret-troque-em-producao"
  );
}

export async function signSession(user: SessionUser, maxAgeSec: number = SESSION_MAX_AGE): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      uid: String(payload.uid),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role === "admin" ? "admin" : "comum",
      mustChange: Boolean(payload.mustChange),
    };
  } catch {
    return null;
  }
}
