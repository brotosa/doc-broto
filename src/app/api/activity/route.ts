import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { logActivity } from "@/lib/auth/users";

export const runtime = "nodejs";

// Registra o uso de uma ferramenta pelo usuário logado.
// Corpo: { action: string, fileName?: string, tool?: string }
export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action.slice(0, 120) : "";
    if (!action) return NextResponse.json({ error: "ação ausente" }, { status: 400 });
    const fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 260) : undefined;
    const tool = typeof body.tool === "string" ? body.tool.slice(0, 80) : undefined;
    await logActivity({ byName: u.name, action, fileName, tool });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }); // nunca quebra a ferramenta
  }
}
