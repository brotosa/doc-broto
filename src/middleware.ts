import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

// Portão de acesso. Roda no Edge, então só verifica o JWT de sessão (jose) —
// nada de Firebase Admin aqui.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Endpoints de autenticação são sempre liberados (login/cadastro/logout).
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const session = await verifySession(req.cookies.get("broto_session")?.value);
  const isApi = pathname.startsWith("/api");

  // Página de login: se já logado (e sem troca pendente), manda pra home.
  if (pathname === "/login") {
    if (session && !session.mustChange) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Sem sessão válida → 401 (API) ou redireciona pro login (páginas).
  if (!session) {
    if (isApi) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  // Troca de senha obrigatória no 1º acesso: prende o usuário em /trocar-senha.
  if (session.mustChange && pathname !== "/trocar-senha") {
    if (isApi) return NextResponse.json({ error: "troca de senha obrigatória" }, { status: 403 });
    return NextResponse.redirect(new URL("/trocar-senha", req.url));
  }

  // Área do admin exige papel admin.
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (session.role !== "admin") {
      if (isApi) return NextResponse.json({ error: "acesso restrito" }, { status: 403 });
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a tudo, menos assets estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|broto-logo.svg|robots.txt).*)"],
};
