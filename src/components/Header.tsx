import Link from "next/link";
import { BrotoLogo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { getSessionUser } from "@/lib/auth/current-user";

export async function Header() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Broto — início">
          <BrotoLogo />
          <span className="ml-1 rounded-md bg-brand-yellow px-2 py-0.5 text-xs font-bold text-brand-ink">
            PDF
          </span>
        </Link>
        {user && (
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link
              href="/meus-arquivos"
              className="hidden rounded-lg px-3 py-1.5 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-brand sm:inline-block"
            >
              Meu histórico
            </Link>
            <Link
              href="/ajuda"
              className="rounded-lg px-3 py-1.5 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-brand"
            >
              Ajuda
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-brand"
              >
                Configurações
              </Link>
            )}
            <ThemeToggle />
            <UserMenu name={user.name} />
          </div>
        )}
        {!user && (
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        )}
      </div>
    </header>
  );
}
