import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { listProfiles, createAccount, audit } from "@/lib/auth/users";

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
    const { email, name, password, role } = await req.json();
    const p = await createAccount({
      email,
      name,
      password,
      role: role === "admin" ? "admin" : "comum",
      approved: true,
      mustChange: true,
    });
    await audit({ action: "criou usuário", byName: admin.name, targetName: p.email, detail: p.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
