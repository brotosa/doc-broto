import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie } from "@/lib/auth/current-user";
import { selfChangePassword, audit } from "@/lib/auth/users";

export const runtime = "nodejs";

// Troca de senha pelo próprio usuário (usada no 1º acesso e no autoatendimento).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  try {
    const { newPassword } = await req.json();
    await selfChangePassword(user.uid, newPassword);
    await setSessionCookie({ ...user, mustChange: false });
    await audit({ action: "trocou a própria senha", byName: user.name });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
