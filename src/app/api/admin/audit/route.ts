import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { listAudit } from "@/lib/auth/users";

export const runtime = "nodejs";

export async function GET() {
  const u = await getSessionUser();
  if (!u || u.role !== "admin") return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  return NextResponse.json({ entries: await listAudit(100) });
}
