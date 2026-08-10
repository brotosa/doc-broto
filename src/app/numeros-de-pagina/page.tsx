"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("numeros-de-pagina")!;

type Pos = "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right" | "top-left";

const POSITIONS: Array<{ key: Pos; label: string }> = [
  { key: "top-left", label: "Sup. esquerda" },
  { key: "top-center", label: "Sup. centro" },
  { key: "top-right", label: "Sup. direita" },
  { key: "bottom-left", label: "Inf. esquerda" },
  { key: "bottom-center", label: "Inf. centro" },
  { key: "bottom-right", label: "Inf. direita" },
];

export default function PageNumbersPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pos, setPos] = useState<Pos>("bottom-center");
  const [size, setSize] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const margin = 24;
      pages.forEach((page, i) => {
        const { width, height } = page.getSize();
        const text = `${i + 1} / ${pages.length}`;
        const textWidth = font.widthOfTextAtSize(text, size);
        const isTop = pos.startsWith("top");
        const y = isTop ? height - margin - size : margin;
        let x = margin;
        if (pos.endsWith("center")) x = (width - textWidth) / 2;
        else if (pos.endsWith("right")) x = width - margin - textWidth;
        page.drawText(text, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
      });
      downloadBlob(await doc.save(), "numerado.pdf");
    } catch (e) {
      setError("Não foi possível numerar o arquivo.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600">Posição</p>
            <div className="grid grid-cols-3 gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPos(p.key)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${pos === p.key ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Tamanho da fonte: {size}px</span>
            <input type="range" min={8} max={32} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" />
          </label>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Processando..." : "Adicionar números"}
      </button>
    </ToolShell>
  );
}
