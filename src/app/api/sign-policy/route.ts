import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getSignPolicy } from "@/lib/auth/sign-policy";

export const runtime = "nodejs";

// Somente o padrão do carimbo de tempo é exposto ao usuário logado (para
// pré-marcar a opção na ferramenta). A URL do TSA fica no servidor.
export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  const p = await getSignPolicy();
  return NextResponse.json({ timestampDefault: p.timestampDefault });
}
