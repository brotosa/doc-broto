import { NextResponse } from "next/server";
import { createAccount, audit } from "@/lib/auth/users";
import { getPrivacy } from "@/lib/privacy";

export const runtime = "nodejs";

// Cadastro público. A conta nasce "pendente" e precisa da liberação do admin.
export async function POST(req: Request) {
  try {
    const { email, name, password, acceptedPrivacy } = await req.json();
    if (acceptedPrivacy !== true) {
      return NextResponse.json({ error: "É preciso aceitar a Política de Privacidade." }, { status: 400 });
    }
    const p = await createAccount({ email, name, password, role: "comum", approved: false });
    await audit({ action: "cadastro", byName: name, targetName: p.email, detail: "aguardando aprovação" });
    // Registra o aceite da Política (nome e data/hora ficam no próprio log).
    // A versão vem do servidor (fonte da verdade), não do cliente.
    const { version } = await getPrivacy();
    await audit({
      action: "aceite da Política de Privacidade",
      byName: name,
      targetName: p.email,
      detail: `versão ${version}`,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
