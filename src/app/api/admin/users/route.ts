import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { listProfiles, createAccount, audit } from "@/lib/auth/users";
import { getToolConfig } from "@/lib/server/tool-config";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await getSessionUser();
  return u && u.role === "admin" ? u : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return NextResponse.json({ users: await listProfiles() });
}

// Admin cria usuário já aprovado, com senha provisória (troca no 1º acesso).
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  try {
    const { email, name, password, role, tools } = await req.json();
    // Novo usuário começa com as ferramentas padrão (configuráveis). Admin não
    // precisa de lista (enxerga tudo), mas guardamos null = acesso total.
    const isAdmin = role === "admin";
    const allowed = isAdmin
      ? null
      : Array.isArray(tools)
        ? tools
        : (await getToolConfig()).defaultTools;
    const p = await createAccount({
      email,
      name,
      password,
      role: isAdmin ? "admin" : "comum",
      approved: true,
      mustChange: true,
      tools: allowed,
    });
    await audit({ action: "criou usuário", byName: admin.name, targetName: p.email, detail: p.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
