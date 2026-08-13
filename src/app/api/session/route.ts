import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie } from "@/lib/auth/current-user";
import { getSessionPolicy } from "@/lib/auth/session-policy";

export const runtime = "nodejs";

// "Heartbeat" + configuração para o guardião de inatividade do cliente.
// Enquanto o usuário está ativo, o cliente chama isto e renova a sessão
// (janela deslizante). Se ficar inativo além do limite, o cookie expira.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  await setSessionCookie(user); // renova a janela
  const { idleMinutes } = await getSessionPolicy();
  return NextResponse.json({ idleMinutes });
}
