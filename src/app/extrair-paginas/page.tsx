"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";
import { parsePageRanges } from "@/lib/parsePages";

const tool = getTool("extrair-paginas")!;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [count, setCount] = useState(0);
  const [range, setRange] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!files[0]) { setCount(0); return; }
    (async () => {
      try {
        const doc = await PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));
        setCount(doc.getPageCount());
        setRange(`1-${doc.getPageCount()}`);
      } catch { setError("Não foi possível abrir o PDF."); }
    })();
  }, [files]);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const src = await PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));
      const idx = parsePageRanges(range, src.getPageCount());
      if (!idx.length) { setError("Informe páginas válidas (ex.: 1-3, 5)."); setBusy(false); return; }
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, idx);
      copied.forEach((p) => out.addPage(p));
      downloadBlob(await out.save(), files[0].name.replace(/\.pdf$/i, "") + "-paginas.pdf");
    } catch (e) {
      setError("Não foi possível extrair as páginas.");
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
          <p className="text-sm text-gray-600">
            Documento com <b>{count || "?"}</b> página(s). Informe quais <b>manter</b>:
          </p>
          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="ex.: 1-3, 5, 8"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <p className="text-xs text-gray-400">Use vírgulas e intervalos: <code>1-3, 5, 8-10</code>.</p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Extraindo..." : "Extrair páginas"}
      </button>
    </ToolShell>
  );
}
