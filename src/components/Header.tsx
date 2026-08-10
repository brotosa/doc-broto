import Link from "next/link";
import { BrotoLogo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Broto — início">
          <BrotoLogo />
          <span className="ml-1 rounded-md bg-brand-yellow px-2 py-0.5 text-xs font-bold text-brand-ink">
            PDF
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <Link href="/" className="hover:text-brand">
            Todas as ferramentas
          </Link>
          <Link href="/#converter" className="hover:text-brand">
            Converter
          </Link>
          <Link href="/#seguranca" className="hover:text-brand">
            Segurança
          </Link>
        </nav>
      </div>
    </header>
  );
}
