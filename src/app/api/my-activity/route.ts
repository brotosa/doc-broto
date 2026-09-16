import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getStore } from "@/lib/auth/store";

export const runtime = "nodejs";

// Histórico de uso das ferramentas pelo próprio usuário logado.
// Não guardamos os arquivos (privacidade) — só o registro (ferramenta, nome, data).
export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  try {
    const store = getStore();
    await store.init();
    const rows = await store.listAuditByUser(u.name, 100, "activity");
    const items = rows.map((r) => ({
      at: r.at,
      tool: r.detail ?? "",
      action: r.action,
      fileName: r.target_name ?? "",
    }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
