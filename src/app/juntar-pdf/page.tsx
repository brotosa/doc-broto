"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("juntar-pdf")!;

export default function MergePage() {
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

  const merge = async () => {
    setError(null);
    setBusy(true);
    try {
      const out = await PDFDocument.create();
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes);
        const pages = await out.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const merged = await out.save();
      downloadBlob(merged, "juntado.pdf");
    } catch (e) {
      setError("Não foi possível juntar os arquivos. Verifique se todos são PDFs válidos.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} multiple hint="Adicione 2 ou mais PDFs" />

      {files.length > 1 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-gray-600">
            Ordem dos arquivos (arraste para reordenar, ou use as setas):
          </p>
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
        onClick={merge}
        disabled={files.length < 2 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Juntando..." : "Juntar PDF"}
      </button>
    </ToolShell>
  );
}
