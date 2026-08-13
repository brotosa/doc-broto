import "server-only";

import { getStore } from "./store";

// Política de segurança editável pelo admin:
//  - Bloqueio de conta após N tentativas de senha erradas (anti brute-force).
//  - Rate limit por IP em login e cadastro (anti brute-force / flood / DDoS).
export type SecurityPolicy = {
  maxFailed: number; // tentativas erradas antes de bloquear a CONTA (0 = desliga)
  lockMinutes: number; // duração do bloqueio da conta, em minutos
  rateEnabled: boolean; // liga/desliga o rate limit por IP
  rateWindowSec: number; // janela do rate limit, em segundos
  rateMaxLogin: number; // máx. de tentativas de login por IP na janela
  rateMaxRegister: number; // máx. de cadastros por IP na janela
};

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  maxFailed: 5,
  lockMinutes: 15,
  rateEnabled: true,
  rateWindowSec: 60,
  rateMaxLogin: 10,
  rateMaxRegister: 5,
};

const KEY = "security_policy";

export async function getSecurityPolicy(): Promise<SecurityPolicy> {
  await getStore().init();
  const saved = await getStore().getSetting<Partial<SecurityPolicy>>(KEY);
  return { ...DEFAULT_SECURITY_POLICY, ...(saved || {}) };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

export async function saveSecurityPolicy(input: Partial<SecurityPolicy>): Promise<SecurityPolicy> {
  await getStore().init();
  const d = DEFAULT_SECURITY_POLICY;
  const policy: SecurityPolicy = {
    maxFailed: clampInt(input.maxFailed, 0, 50, d.maxFailed),
    lockMinutes: clampInt(input.lockMinutes, 1, 1440, d.lockMinutes),
    rateEnabled: input.rateEnabled === undefined ? d.rateEnabled : !!input.rateEnabled,
    rateWindowSec: clampInt(input.rateWindowSec, 5, 3600, d.rateWindowSec),
    rateMaxLogin: clampInt(input.rateMaxLogin, 1, 1000, d.rateMaxLogin),
    rateMaxRegister: clampInt(input.rateMaxRegister, 1, 1000, d.rateMaxRegister),
  };
  await getStore().setSetting(KEY, policy);
  return policy;
}
