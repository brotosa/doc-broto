import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-bold text-white">
            D
          </span>
          <span className="text-lg font-semibold">
            Doc<span className="text-brand">Broto</span>
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
