"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Atalhos globais de teclado. "?" abre esta ajuda. Ignora quando o foco está
// num campo de texto (para não atrapalhar a digitação).
const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "?", desc: "Mostrar/ocultar esta ajuda" },
  { keys: "g depois h", desc: "Ir para o início" },
  { keys: "g depois a", desc: "Ir para a Ajuda" },
  { keys: "g depois m", desc: "Ir para Meu histórico" },
  { keys: "/", desc: "Focar a busca de ferramentas" },
  { keys: "d", desc: "Alternar modo claro/escuro" },
  { keys: "Esc", desc: "Fechar" },
];

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  if (!n) return false;
  const tag = n.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || n.isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let gPending = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (isTyping(e.target)) return;

      // sequência "g" + tecla
      if (gPending) {
        gPending = false;
        if (gTimer) clearTimeout(gTimer);
        if (e.key === "h") return void router.push("/");
        if (e.key === "a") return void router.push("/ajuda");
        if (e.key === "m") return void router.push("/meus-arquivos");
        return;
      }

      if (e.key === "g") {
        gPending = true;
        gTimer = setTimeout(() => (gPending = false), 900);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/") {
        const search = document.querySelector<HTMLInputElement>('input[data-search], input[type="search"]');
        if (search) {
          e.preventDefault();
          search.focus();
        }
        return;
      }
      if (e.key === "d") {
        const el = document.documentElement;
        const next = !el.classList.contains("dark");
        el.classList.toggle("dark", next);
        try {
          localStorage.setItem("broto-theme", next ? "dark" : "light");
        } catch {
          /* ignora */
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Atalhos de teclado</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">✕</button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-600">{s.desc}</span>
              <kbd className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700">{s.keys}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
