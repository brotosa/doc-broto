"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Tool } from "@/lib/tools";
import { performDownload, formatBytes } from "@/lib/download";

type Result = { blob: Blob; filename: string };

export function ToolShell({
  tool,
  children,
  wide = false,
}: {
  tool: Tool;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as Result;
      if (d?.blob) {
        setResult(d);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("broto:result", h as EventListener);
    return () => window.removeEventListener("broto:result", h as EventListener);
  }, []);

  return (
    <div className={`mx-auto ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand"
      >
        ← Todas as ferramentas
      </Link>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{tool.title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-gray-500">{tool.description}</p>
      </div>

      {result ? (
        // Só o miolo troca: mostra o resultado no lugar do formulário, mantendo
        // o cabeçalho e o padrão da página.
        <div className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-green/15 text-3xl font-bold text-brand-green">
            ✓
          </div>
          <h2 className="text-xl font-bold text-gray-900">Documento concluído!</h2>
          <p className="mx-auto mt-1 max-w-xs break-all text-sm text-gray-500">
            {result.filename} · {formatBytes(result.blob.size)}
          </p>
          <button
            onClick={() => performDownload(result.blob, result.filename)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark"
          >
            ⤓ Baixar arquivo
          </button>
          <button
            onClick={() => {
              setResult(null);
              setResetKey((k) => k + 1); // remonta a ferramenta = formulário limpo, sem reload
            }}
            className="mt-3 w-full rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            ↻ Gerar novo
          </button>
        </div>
      ) : (
        <div key={resetKey}>{children}</div>
      )}
    </div>
  );
}
