import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getPolicy, savePolicy } from "@/lib/auth/policy";
import { audit } from "@/lib/auth/users";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await getSessionUser();
  return u && u.role === "admin" ? u : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return NextResponse.json({ policy: await getPolicy() });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  try {
    const policy = await savePolicy(await req.json());
    await audit({ action: "atualizou a política de senha", byName: admin.name });
    return NextResponse.json({ policy });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
