import { NextResponse } from "next/server";
import { authenticate, ensureAdminSeed, audit } from "@/lib/auth/users";
import { setSessionCookie } from "@/lib/auth/current-user";
import { getSecurityPolicy } from "@/lib/auth/security-policy";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const sec = await getSecurityPolicy();
  if (sec.rateEnabled) {
    const rl = rateLimit(`login:${ip}`, sec.rateMaxLogin, sec.rateWindowSec);
    if (!rl.ok) {
      if (rl.justTripped) {
        await audit({ action: "muitas tentativas de login (bloqueio por IP)", detail: ip });
      }
      return NextResponse.json(
        { error: `Muitas tentativas. Aguarde ${rl.retryAfterSec}s e tente novamente.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
  }
  try {
    await ensureAdminSeed();
    const { email, password } = await req.json();
    const p = await authenticate(email, password);
    await setSessionCookie({
      uid: p.id,
      email: p.email,
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
