"use client";

import { useState } from "react";
import type { Tool } from "@/lib/tools";
import { ToolShell } from "./ToolShell";
import { FileDropzone } from "./FileDropzone";

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv";

/** Combina arquivos misturados (PDF + Office) em um único PDF ou Word. */
export function CombineTool({
  tool,
  target,
  buttonLabel,
  downloadName,
}: {
  tool: Tool;
  target: "pdf" | "docx";
  buttonLabel: string;
  downloadName: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragI, setDragI] = useState<number | null>(null);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    setFiles(next);
  };
  const dropAt = (to: number) => {
    if (dragI === null || dragI === to) return;
    const next = [...files];
    const [m] = next.splice(dragI, 1);
    next.splice(to, 0, m);
    setFiles(next);
    setDragI(null);
  };

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch(`/api/combine?target=${target}`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Erro ${res.status} ao combinar.`);
        return;
      }
      const blob = await res.blob();
      window.dispatchEvent(new CustomEvent("broto:result", { detail: { blob, filename: downloadName } }));
    } catch {
      setError("Falha de rede ao combinar os arquivos.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} multiple accept={ACCEPT} hint="Adicione 2 ou mais arquivos (PDF, Word, Excel, PowerPoint…)" />

      {files.length > 1 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-gray-600">Ordem (arraste para reordenar, ou use as setas):</p>
          <ul className="space-y-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                draggable
                onDragStart={() => setDragI(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropAt(i)}
                onDragEnd={() => setDragI(null)}
                className={`flex cursor-move items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm transition ${
                  dragI === i ? "border-brand opacity-50" : "border-gray-200 hover:border-brand/40"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-gray-300" aria-hidden>⠿</span>
                  <span className="truncate">{i + 1}. {f.name}</span>
                </span>
                <span className="flex gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === files.length - 1} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30">↓</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length < 2 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Combinando..." : buttonLabel}
      </button>
    </ToolShell>
  );
}
