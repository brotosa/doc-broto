"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-brand"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span className="hidden sm:inline">{name}</span>
        <span className="text-xs text-gray-400">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          <Link
            href="/trocar-senha"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Trocar senha
          </Link>
          <button
            role="menuitem"
            onClick={sair}
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
