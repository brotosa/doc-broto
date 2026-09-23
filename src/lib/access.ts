// Lógica pura de acesso a ferramentas (usável no cliente e no servidor).
// Sem imports de servidor.

export type ToolState = "active" | "maintenance" | "hidden";

export type ToolsAccess = {
  isAdmin: boolean;
  // Slugs permitidos para o usuário. null = acesso total (todos).
  allowed: string[] | null;
  // Estado global por ferramenta (ausente = "active").
  states: Record<string, ToolState>;
};

export function globalState(states: Record<string, ToolState>, slug: string): ToolState {
  return states[slug] ?? "active";
}

/** O usuário tem permissão individual para a ferramenta? (ignora estado global) */
export function hasPermission(access: Pick<ToolsAccess, "isAdmin" | "allowed">, slug: string): boolean {
  if (access.isAdmin) return true;
  if (access.allowed == null) return true; // acesso total
  return access.allowed.includes(slug);
}

export type ToolAvailability = {
  visible: boolean; // aparece na home?
  enabled: boolean; // botão clicável?
  reason?: "maintenance" | "no-access"; // motivo de desativação (quando enabled=false)
};

/**
 * Disponibilidade efetiva de uma ferramenta para o usuário, combinando o
 * estado global e a permissão individual. Admin enxerga tudo (inclusive
 * ferramentas ocultas/manutenção, para poder gerenciar).
 */
export function availability(access: ToolsAccess, slug: string): ToolAvailability {
  const state = globalState(access.states, slug);
  if (access.isAdmin) {
    // Admin vê tudo e sempre consegue abrir (mas enxerga o estado real).
    return { visible: true, enabled: true, reason: state === "active" ? undefined : "maintenance" };
  }
  if (state === "hidden") return { visible: false, enabled: false };
  if (state === "maintenance") return { visible: true, enabled: false, reason: "maintenance" };
  if (!hasPermission(access, slug)) return { visible: true, enabled: false, reason: "no-access" };
  return { visible: true, enabled: true };
}

/** Pode efetivamente USAR (chamar) a ferramenta? Base do bloqueio no back-end. */
export function canUse(access: ToolsAccess, slug: string): boolean {
  if (access.isAdmin) return true;
  const state = globalState(access.states, slug);
  if (state !== "active") return false;
  return hasPermission(access, slug);
}
