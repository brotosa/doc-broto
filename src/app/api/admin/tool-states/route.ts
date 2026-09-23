import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getToolConfig, saveToolConfig } from "@/lib/server/tool-config";
import { audit } from "@/lib/auth/users";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await getSessionUser();
  return u && u.role === "admin" ? u : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return NextResponse.json(await getToolConfig());
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  try {
    const body = await req.json();
    const cfg = await saveToolConfig({ states: body.states, defaultTools: body.defaultTools });
    const emMan = Object.values(cfg.states).filter((s) => s === "maintenance").length;
    const ocultas = Object.values(cfg.states).filter((s) => s === "hidden").length;
    await audit({
      action: "atualizou a disponibilidade das ferramentas",
      byName: admin.name,
      detail: `${emMan} em manutenção · ${ocultas} ocultas · ${cfg.defaultTools.length} padrão`,
    });
    return NextResponse.json(cfg);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
