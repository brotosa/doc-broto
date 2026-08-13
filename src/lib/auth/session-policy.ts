import "server-only";

import { getStore } from "./store";

// Política de sessão: tempo máximo de INATIVIDADE (em minutos).
// idleMinutes = 0 → desligado (sessão longa, ver SESSION_ABSOLUTE_FALLBACK).
export type SessionPolicy = { idleMinutes: number };

export const DEFAULT_SESSION_POLICY: SessionPolicy = { idleMinutes: 30 };

const KEY = "session_policy";

export async function getSessionPolicy(): Promise<SessionPolicy> {
  await getStore().init();
  const saved = await getStore().getSetting<Partial<SessionPolicy>>(KEY);
  return { ...DEFAULT_SESSION_POLICY, ...(saved || {}) };
}

export async function saveSessionPolicy(input: Partial<SessionPolicy>): Promise<SessionPolicy> {
  await getStore().init();
  const n = Math.round(Number(input.idleMinutes));
  const idleMinutes = Number.isFinite(n) ? Math.max(0, Math.min(1440, n)) : DEFAULT_SESSION_POLICY.idleMinutes;
  const policy: SessionPolicy = { idleMinutes };
  await getStore().setSetting(KEY, policy);
  return policy;
}

/** Janela da sessão (em segundos) conforme a política de inatividade. */
export function sessionWindowSec(idleMinutes: number): number {
  return idleMinutes > 0 ? idleMinutes * 60 : 12 * 60 * 60; // 12h quando desligado
}
