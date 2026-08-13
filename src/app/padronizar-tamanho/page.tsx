"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("padronizar-tamanho")!;

const SIZES = {
  a4: { label: "A4", w: 595.28, h: 841.89 },
  carta: { label: "Carta", w: 612, h: 792 },
};
type SizeKey = keyof typeof SIZES;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [size, setSize] = useState<SizeKey>("a4");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const src = await PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));
      const out = await PDFDocument.create();
      const { w: W, h: H } = SIZES[size];
      const pages = src.getPages();

      for (let i = 0; i < pages.length; i++) {
        const sp = pages[i];
        const { width: pw, height: ph } = sp.getSize();
        // Alvo segue a orientação da página (retrato x paisagem).
        const [tw, th] = pw > ph ? [H, W] : [W, H];
        const embedded = await out.embedPage(sp);
        const scale = Math.min(tw / pw, th / ph);
        const dw = pw * scale;
        const dh = ph * scale;
        const page = out.addPage([tw, th]);
        page.drawPage(embedded, { x: (tw - dw) / 2, y: (th - dh) / 2, width: dw, height: dh });
      }

      downloadBlob(await out.save(), files[0].name.replace(/\.pdf$/i, "") + `-${SIZES[size].label}.pdf`);
    } catch (e) {
      setError("Não foi possível padronizar o arquivo.");
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
          <p className="text-sm font-medium text-gray-700">Tamanho de página</p>
          <div className="flex gap-2">
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSize(k)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${size === k ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
              >
                {SIZES[k].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Cada página é redimensionada para caber no tamanho escolhido, centralizada e sem cortar o conteúdo.
          </p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Padronizando..." : "Padronizar tamanho"}
      </button>
    </ToolShell>
  );
}
