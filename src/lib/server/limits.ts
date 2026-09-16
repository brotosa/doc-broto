import "server-only";
import { getStore } from "@/lib/auth/store";

// Limites operacionais configuráveis pelo admin (aba "Limites").
// Guardados em settings["limits"]; com cache curto para não bater no banco a
// cada upload. Defaults conservadores, iguais aos valores fixos anteriores.
export type Limits = {
  /** Tamanho máximo de cada arquivo enviado (MB). */
  maxUploadMB: number;
  /** Tempo máximo de processamento de uma conversão (segundos). */
  timeoutSec: number;
  /** Máximo de arquivos por lote (batch). */
  maxBatch: number;
};

export const DEFAULT_LIMITS: Limits = { maxUploadMB: 100, timeoutSec: 300, maxBatch: 20 };

// Faixas aceitas (defensivo contra valores absurdos vindos do settings).
const CLAMP = {
  maxUploadMB: [1, 1024] as const,
  timeoutSec: [30, 1800] as const,
  maxBatch: [2, 100] as const,
};

function clamp(v: unknown, [min, max]: readonly [number, number], fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeLimits(raw: Partial<Limits> | null | undefined): Limits {
  return {
    maxUploadMB: clamp(raw?.maxUploadMB, CLAMP.maxUploadMB, DEFAULT_LIMITS.maxUploadMB),
    timeoutSec: clamp(raw?.timeoutSec, CLAMP.timeoutSec, DEFAULT_LIMITS.timeoutSec),
    maxBatch: clamp(raw?.maxBatch, CLAMP.maxBatch, DEFAULT_LIMITS.maxBatch),
  };
}

let cache: { at: number; value: Limits } | null = null;
const TTL_MS = 30_000;

export async function getLimits(): Promise<Limits> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let raw: Partial<Limits> | null = null;
  try {
    raw = await getStore().getSetting<Partial<Limits>>("limits");
  } catch {
    /* store indisponível → usa defaults */
  }
  const value = normalizeLimits(raw);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveLimits(raw: Partial<Limits>): Promise<Limits> {
  const value = normalizeLimits(raw);
  await getStore().setSetting("limits", value);
  cache = { at: Date.now(), value };
  return value;
}

export async function maxUploadBytes(): Promise<number> {
  return (await getLimits()).maxUploadMB * 1024 * 1024;
}
