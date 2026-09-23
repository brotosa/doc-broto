import "server-only";
import { getSessionUser } from "@/lib/auth/current-user";
import { getProfile } from "@/lib/auth/users";
import { getToolConfig } from "./tool-config";
import { canUse, type ToolsAccess } from "@/lib/access";
import { ProcessingError } from "./exec";

// Monta o acesso efetivo do usuário logado (papel + permissões + estados
// globais). Retorna null se não houver sessão.
export async function currentAccess(): Promise<ToolsAccess | null> {
  const u = await getSessionUser();
  if (!u) return null;
  const cfg = await getToolConfig();
  const isAdmin = u.role === "admin";
  let allowed: string[] | null = null;
  if (!isAdmin) {
    const prof = await getProfile(u.uid);
    allowed = prof?.tools ?? null; // null = acesso total
  }
  return { isAdmin, allowed, states: cfg.states };
}

// Bloqueia a rota quando o usuário não pode usar a ferramenta (sem permissão
// ou ferramenta em manutenção/oculta). Lança ProcessingError (mensagem clara).
export async function requireToolAccess(slug: string): Promise<void> {
  const access = await currentAccess();
  if (!access) throw new ProcessingError("Não autenticado.");
  if (!canUse(access, slug)) {
    throw new ProcessingError(
      "Você não tem acesso a esta ferramenta (sem permissão ou em manutenção). Fale com o administrador."
    );
  }
}
