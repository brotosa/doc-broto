import { NextResponse } from "next/server";
import { authenticate, ensureAdminSeed, audit } from "@/lib/auth/users";
import { setSessionCookie } from "@/lib/auth/current-user";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await ensureAdminSeed();
    const { username, password } = await req.json();
    const p = await authenticate(username, password);
    await setSessionCookie({
      uid: p.id,
      username: p.username,
      name: p.name,
      role: p.role,
      mustChange: p.mustChange,
    });
    await audit({ action: "login", byName: p.name });
    return NextResponse.json({ mustChange: p.mustChange, role: p.role });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
}
