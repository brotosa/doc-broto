"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTool } from "@/lib/tools";

type Item = { at: number; tool: string; action: string; fileName: string };

function fmt(ts: number): string {
  try {
    return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function MeusArquivosPage() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    fetch("/api/my-activity")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-brand">← Todas as ferramentas</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Meu histórico</h1>
        <p className="mt-1 text-sm text-gray-500">
          Últimas ferramentas que você usou. Por privacidade, <b>os arquivos não são guardados</b> —
          isto é só um registro (ferramenta, arquivo e data) para você reabrir a ferramenta rapidamente.
        </p>
      </div>

      {items === null && <p className="text-sm text-gray-400">Carregando…</p>}

      {items !== null && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Você ainda não usou nenhuma ferramenta nesta conta.</p>
          <Link href="/" className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Explorar ferramentas
          </Link>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, i) => {
            const tool = getTool(it.tool);
            return (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${tool?.color ?? "bg-gray-200 text-gray-600"}`}>
                  <span dangerouslySetInnerHTML={{ __html: tool?.glyph ?? "•" }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                    {tool?.title ?? it.action}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {it.fileName || "—"} · {fmt(it.at)}
                  </p>
                </div>
                {tool && (
                  <Link
                    href={`/${it.tool}`}
                    className="shrink-0 rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white"
                  >
                    Usar de novo
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
