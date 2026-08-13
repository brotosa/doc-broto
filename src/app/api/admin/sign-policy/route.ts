import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getSignPolicy, saveSignPolicy } from "@/lib/auth/sign-policy";
import { audit } from "@/lib/auth/users";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await getSessionUser();
  return u && u.role === "admin" ? u : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return NextResponse.json({ policy: await getSignPolicy() });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  try {
    const policy = await saveSignPolicy(await req.json());
    await audit({
      action: "atualizou a assinatura digital",
      byName: admin.name,
      detail: `carimbo ${policy.timestampDefault ? "padrão on" : "opcional"} · TSA ${policy.tsaUrl}`,
    });
    return NextResponse.json({ policy });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
