import { NextResponse } from "next/server";
import { ensureAdminSeed } from "@/lib/auth/users";

export const runtime = "nodejs";

// Garante que o primeiro admin exista (idempotente). Chamado ao abrir o login.
export async function GET() {
  try {
    await ensureAdminSeed();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
