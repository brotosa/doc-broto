"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("dividir-por-tamanho")!;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [maxMb, setMaxMb] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setError(null); setWarn(null);
    try {
      const src = await PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));
      const total = src.getPageCount();
      const maxBytes = Math.max(0.2, maxMb) * 1024 * 1024;

      // Cada parte é reconstruída do zero (copyPages) para que o tamanho medido
      // seja o real — remover páginas no pdf-lib deixaria imagens órfãs e não
      // reduziria o arquivo.
      const buildBytes = async (from: number, to: number): Promise<Uint8Array> => {
        const doc = await PDFDocument.create();
        const idx = Array.from({ length: to - from + 1 }, (_, k) => from + k);
        const copied = await doc.copyPages(src, idx);
        copied.forEach((p) => doc.addPage(p));
        return doc.save();
      };

      const chunks: Uint8Array[] = [];
      let oversizePages = 0;
      let start = 0;
      while (start < total) {
        let chosen: Uint8Array | null = null;
        let end = start;
        while (end < total) {
          const bytes = await buildBytes(start, end);
          if (bytes.length <= maxBytes) { chosen = bytes; end++; }        // cabe: tenta mais uma
          else if (end === start) { chosen = bytes; oversizePages++; end++; break; } // 1 página já estoura
          else break;                                                     // fecha sem esta página
        }
        chunks.push(chosen!);
        start = end;
      }

      if (oversizePages > 0) {
        setWarn(`${oversizePages} página(s) sozinha(s) já passam de ${maxMb} MB e não podem ser divididas — ficaram inteiras em uma parte.`);
      }

      const baseName = files[0].name.replace(/\.pdf$/i, "");
      if (chunks.length === 1) {
        downloadBlob(chunks[0], `${baseName}.pdf`);
      } else {
        const zip = new JSZip();
        chunks.forEach((c, i) => zip.file(`${baseName}-parte-${i + 1}.pdf`, c));
        const out = await zip.generateAsync({ type: "blob" });
        downloadBlob(out, `${baseName}-partes.zip`, "application/zip");
      }
    } catch (e) {
      setError("Não foi possível dividir o arquivo.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Tamanho máximo de cada parte (MB)</span>
            <input
              type="number" min={0.5} max={100} step={0.5}
              value={maxMb}
              onChange={(e) => setMaxMb(Number(e.target.value))}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <p className="text-xs text-gray-400">
            Cada parte terá o máximo de páginas possível sem passar do limite. Se sair mais de uma
            parte, o download vem num .zip.
          </p>
        </div>
      )}

      {warn && <p className="mt-4 rounded-lg bg-brand-yellow/30 px-3 py-2 text-sm text-brand-ink">{warn}</p>}
      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Dividindo..." : "Dividir por tamanho"}
      </button>
    </ToolShell>
  );
}
