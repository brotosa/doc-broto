import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getLimits, saveLimits } from "@/lib/server/limits";
import { audit } from "@/lib/auth/users";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await getSessionUser();
  return u && u.role === "admin" ? u : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return NextResponse.json({ limits: await getLimits() });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  try {
    const limits = await saveLimits(await req.json());
    await audit({
      action: "atualizou os limites operacionais",
      byName: admin.name,
      detail: `${limits.maxUploadMB} MB · ${limits.timeoutSec}s · lote ${limits.maxBatch}`,
    });
    return NextResponse.json({ limits });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
