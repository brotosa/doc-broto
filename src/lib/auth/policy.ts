import "server-only";

import { getStore } from "./store";

export type PasswordPolicy = {
  minLength: number;
  requireLower: boolean;
  requireUpper: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  expirationDays: number; // 0 = nunca expira
  preventReuse: number; // nº de senhas anteriores que não podem repetir (0 = desliga)
};

export const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireLower: true,
  requireUpper: false,
  requireNumber: true,
  requireSymbol: false,
  expirationDays: 0,
  preventReuse: 3,
};

const KEY = "password_policy";

export async function getPolicy(): Promise<PasswordPolicy> {
  await getStore().init();
  const saved = await getStore().getSetting<Partial<PasswordPolicy>>(KEY);
  return { ...DEFAULT_POLICY, ...(saved || {}) };
}

export async function savePolicy(input: Partial<PasswordPolicy>): Promise<PasswordPolicy> {
  await getStore().init();
  const clampInt = (v: unknown, lo: number, hi: number, def: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : def;
  };
  const policy: PasswordPolicy = {
    minLength: clampInt(input.minLength, 4, 64, DEFAULT_POLICY.minLength),
    requireLower: !!input.requireLower,
    requireUpper: !!input.requireUpper,
    requireNumber: !!input.requireNumber,
    requireSymbol: !!input.requireSymbol,
    expirationDays: clampInt(input.expirationDays, 0, 3650, DEFAULT_POLICY.expirationDays),
    preventReuse: clampInt(input.preventReuse, 0, 24, DEFAULT_POLICY.preventReuse),
  };
  await getStore().setSetting(KEY, policy);
  return policy;
}

// Retorna uma mensagem de erro se a senha não atender à política, ou null se ok.
export function validatePassword(pw: string, p: PasswordPolicy): string | null {
  if (!pw || pw.length < p.minLength) return `A senha deve ter ao menos ${p.minLength} caracteres.`;
  const faltas: string[] = [];
  if (p.requireLower && !/[a-z]/.test(pw)) faltas.push("uma letra minúscula");
  if (p.requireUpper && !/[A-Z]/.test(pw)) faltas.push("uma letra maiúscula");
  if (p.requireNumber && !/[0-9]/.test(pw)) faltas.push("um número");
  if (p.requireSymbol && !/[^A-Za-z0-9]/.test(pw)) faltas.push("um símbolo");
  if (faltas.length) return `A senha precisa conter ${faltas.join(", ")}.`;
  return null;
}
