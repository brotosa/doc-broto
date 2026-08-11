import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/current-user";
import { getProfile, updateUser, deleteUser, audit } from "@/lib/auth/users";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await getSessionUser();
  return u && u.role === "admin" ? u : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  const { id } = await params;

  const alvo = await getProfile(id);
  if (!alvo) return NextResponse.json({ error: "usuário não encontrado" }, { status: 404 });

  const patch = await req.json();

  // Proteções: o admin não pode se rebaixar nem se desativar (evita ficar sem admin).
  if (id === admin.uid) {
    if (patch.role && patch.role !== "admin")
      return NextResponse.json({ error: "Você não pode rebaixar a si mesmo." }, { status: 400 });
    if (patch.active === false)
      return NextResponse.json({ error: "Você não pode desativar a si mesmo." }, { status: 400 });
  }

  try {
    await updateUser(id, patch);
    const acoes: string[] = [];
    if (patch.approved === true) acoes.push("aprovou");
    if (patch.active === false) acoes.push("desativou");
    if (patch.active === true) acoes.push("reativou");
    if (patch.role) acoes.push(`definiu tipo=${patch.role}`);
    if (typeof patch.name === "string") acoes.push("renomeou");
    if (patch.password) acoes.push("redefiniu senha");
    await audit({
      action: acoes.join(", ") || "editou usuário",
      byName: admin.name,
      targetName: alvo.email,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
  const { id } = await params;
  if (id === admin.uid)
    return NextResponse.json({ error: "Você não pode excluir a si mesmo." }, { status: 400 });

  const alvo = await getProfile(id);
  if (!alvo) return NextResponse.json({ error: "usuário não encontrado" }, { status: 404 });
  await deleteUser(id);
  await audit({ action: "excluiu usuário", byName: admin.name, targetName: alvo.email });
  return NextResponse.json({ ok: true });
}
