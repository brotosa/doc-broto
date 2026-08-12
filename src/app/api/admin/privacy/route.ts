import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getPrivacy, savePrivacy } from "@/lib/privacy";
import { audit } from "@/lib/auth/users";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await getSessionUser();
  return u && u.role === "admin" ? u : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return NextResponse.json({ privacy: await getPrivacy() });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  try {
    const privacy = await savePrivacy(await req.json());
    await audit({ action: "atualizou a Política de Privacidade", byName: admin.name, detail: `versão ${privacy.version}` });
    return NextResponse.json({ privacy });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
