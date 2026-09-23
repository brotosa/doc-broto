import { NextResponse } from "next/server";
import { currentAccess } from "@/lib/server/access-guard";

export const runtime = "nodejs";

// Acesso efetivo do usuário logado (para a home e as telas das ferramentas
// mostrarem o que está disponível, em manutenção ou sem acesso).
export async function GET() {
  const access = await currentAccess();
  if (!access) return NextResponse.json({ isAdmin: false, allowed: [], states: {} }, { status: 401 });
  return NextResponse.json(access);
}
