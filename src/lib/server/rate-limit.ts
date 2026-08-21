import "server-only";

import { getStore } from "@/lib/auth/store";

// Rate limit por IP. A contagem (janela deslizante) é feita pelo store:
// no Postgres é PERSISTENTE (não zera em deploy); em memória no fallback dev.
// A auditoria do bloqueio é "uma vez por janela" via um mapa em memória —
// só controla o barulho no log, não o bloqueio em si.

const notified = new Map<string, number>();

export type RateResult = {
  ok: boolean;
  retryAfterSec: number;
  justTripped: boolean; // true só na 1ª rejeição da janela (p/ auditar sem flood)
};

export async function rateLimit(key: string, max: number, windowSec: number): Promise<RateResult> {
  await getStore().init();
  const { ok, retryAfterSec } = await getStore().rateConsume(key, windowSec, max);
  if (ok) return { ok: true, retryAfterSec: 0, justTripped: false };
  const now = Date.now();
  const last = notified.get(key) || 0;
  const justTripped = now - last > windowSec * 1000;
  if (justTripped) {
    notified.set(key, now);
    if (notified.size > 5000) notified.clear(); // evita crescer sem limite
  }
  return { ok: false, retryAfterSec, justTripped };
}

/** IP do cliente a partir dos cabeçalhos de proxy (Caddy define X-Forwarded-For). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "desconhecido";
}
