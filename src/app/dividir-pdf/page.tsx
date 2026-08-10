"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";
import { parsePageRanges } from "@/lib/parsePages";

const tool = getTool("dividir-pdf")!;

type Mode = "range" | "each";

export default function SplitPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<Mode>("range");
  const [range, setRange] = useState("1-1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const src = await PDFDocument.load(bytes);
      const count = src.getPageCount();

      if (mode === "range") {
        const indices = parsePageRanges(range, count);
        if (indices.length === 0) {
          setError("Intervalo inválido. Ex.: 1-3, 5, 8-10");
          return;
        }
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, indices);
        pages.forEach((p) => out.addPage(p));
        downloadBlob(await out.save(), "dividido.pdf");
      } else {
        const zip = new JSZip();
        for (let i = 0; i < count; i++) {
          const out = await PDFDocument.create();
          const [page] = await out.copyPages(src, [i]);
          out.addPage(page);
          zip.file(`pagina-${i + 1}.pdf`, await out.save());
        }
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, "paginas.zip", "application/zip");
      }
    } catch (e) {
      setError("Não foi possível dividir o arquivo. Verifique se é um PDF válido.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setMode("range")}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${mode === "range" ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
            >
              Extrair intervalo
            </button>
            <button
              onClick={() => setMode("each")}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${mode === "each" ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
            >
              Cada página (ZIP)
            </button>
          </div>

          {mode === "range" && (
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Páginas a extrair</span>
              <input
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="Ex.: 1-3, 5, 8-10"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
              />
            </label>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Processando..." : "Dividir PDF"}
      </button>
    </ToolShell>
  );
}
