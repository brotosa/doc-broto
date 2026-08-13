import "server-only";

// Rate limit por IP em memória (janela deslizante). O servidor roda como um
// único processo Node (standalone) na Lightsail, então um mapa em memória
// basta e não depende do banco. Reinicia junto com o processo — aceitável
// para conter brute-force/flood.

type Bucket = { hits: number[]; notifiedAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export type RateResult = {
  ok: boolean;
  retryAfterSec: number; // quando bloqueado, segundos até liberar
  justTripped: boolean; // true só na 1ª rejeição da janela (p/ auditar sem flood)
};

/**
 * Consome 1 tentativa para `key`. Permite até `max` tentativas por janela de
 * `windowSec` segundos. Retorna ok=false quando estourar.
 */
export function rateLimit(key: string, max: number, windowSec: number): RateResult {
  const now = Date.now();
  const windowMs = windowSec * 1000;

  // Limpeza periódica de chaves antigas (evita crescer sem limite).
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, b] of buckets) {
      if (!b.hits.length || b.hits[b.hits.length - 1] < now - windowMs * 2) buckets.delete(k);
    }
  }

  let b = buckets.get(key);
  if (!b) {
    b = { hits: [], notifiedAt: 0 };
    buckets.set(key, b);
  }
  // descarta tentativas fora da janela
  const cutoff = now - windowMs;
  b.hits = b.hits.filter((t) => t > cutoff);

  if (b.hits.length >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((b.hits[0] + windowMs - now) / 1000));
    const justTripped = now - b.notifiedAt > windowMs;
    if (justTripped) b.notifiedAt = now;
    return { ok: false, retryAfterSec, justTripped };
  }

  b.hits.push(now);
  return { ok: true, retryAfterSec: 0, justTripped: false };
}

/** IP do cliente a partir dos cabeçalhos de proxy (Caddy define X-Forwarded-For). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "desconhecido";
}
