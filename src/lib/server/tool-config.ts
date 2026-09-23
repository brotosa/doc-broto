import "server-only";
import { getStore } from "@/lib/auth/store";
import { FUNDAMENTAL_TOOLS, TOOLS } from "@/lib/tools";
import type { ToolState } from "@/lib/access";

// Configuração global das ferramentas (aba Configurações → Ferramentas):
//  - states: estado por ferramenta (active/maintenance/hidden). "active" é o
//    padrão e não precisa ser guardado.
//  - defaultTools: ferramentas pré-selecionadas ao criar um novo usuário.
export type ToolConfig = { states: Record<string, ToolState>; defaultTools: string[] };

const VALID = new Set(TOOLS.map((t) => t.slug));

function normalizeStates(raw: unknown): Record<string, ToolState> {
  const out: Record<string, ToolState> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (VALID.has(k) && (v === "maintenance" || v === "hidden")) out[k] = v;
    }
  }
  return out;
}

function normalizeSlugs(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  return raw.filter((s): s is string => typeof s === "string" && VALID.has(s));
}

let cache: { at: number; value: ToolConfig } | null = null;
const TTL_MS = 15_000;

export async function getToolConfig(): Promise<ToolConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let rawStates: unknown = null;
  let rawDefault: unknown = null;
  try { rawStates = await getStore().getSetting("tool_states"); } catch { /* usa default */ }
  try { rawDefault = await getStore().getSetting("default_tools"); } catch { /* usa default */ }
  const value: ToolConfig = {
    states: normalizeStates(rawStates),
    defaultTools: normalizeSlugs(rawDefault, FUNDAMENTAL_TOOLS),
  };
  cache = { at: Date.now(), value };
  return value;
}

export async function saveToolConfig(input: { states?: unknown; defaultTools?: unknown }): Promise<ToolConfig> {
  const store = getStore();
  if (input.states !== undefined) await store.setSetting("tool_states", normalizeStates(input.states));
  if (input.defaultTools !== undefined) await store.setSetting("default_tools", normalizeSlugs(input.defaultTools, FUNDAMENTAL_TOOLS));
  cache = null;
  return getToolConfig();
}
