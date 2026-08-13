import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getSecurityPolicy, saveSecurityPolicy } from "@/lib/auth/security-policy";
import { audit } from "@/lib/auth/users";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await getSessionUser();
  return u && u.role === "admin" ? u : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return NextResponse.json({ policy: await getSecurityPolicy() });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  try {
    const policy = await saveSecurityPolicy(await req.json());
    await audit({
      action: "atualizou a política de segurança",
      byName: admin.name,
      detail: `bloqueio ${policy.maxFailed || "off"}×/${policy.lockMinutes}min · rate ${policy.rateEnabled ? "on" : "off"} ${policy.rateMaxLogin}login/${policy.rateMaxRegister}cad por ${policy.rateWindowSec}s`,
    });
    return NextResponse.json({ policy });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
