import { NextResponse } from "next/server";
import { createAccount, audit } from "@/lib/auth/users";

export const runtime = "nodejs";

// Cadastro público. A conta nasce "pendente" e precisa da liberação do admin.
export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json();
    const p = await createAccount({ email, name, password, role: "comum", approved: false });
    await audit({ action: "cadastro", byName: name, targetName: p.email, detail: "aguardando aprovação" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
