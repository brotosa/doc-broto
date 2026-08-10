"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("marca-dagua")!;

export default function WatermarkPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("CONFIDENCIAL");
  const [opacity, setOpacity] = useState(0.25);
  const [size, setSize] = useState(48);
  const [diagonal, setDiagonal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: height / 2 - size / 2,
          size,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity,
          rotate: diagonal ? degrees(45) : degrees(0),
        });
      });
      downloadBlob(await doc.save(), "marca-dagua.pdf");
    } catch (e) {
      setError("Não foi possível aplicar a marca d'água.");
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
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Texto da marca d'água</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Transparência: {Math.round(opacity * 100)}%</span>
            <input type="range" min={5} max={100} value={opacity * 100} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Tamanho: {size}px</span>
            <input type="range" min={20} max={120} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={diagonal} onChange={(e) => setDiagonal(e.target.checked)} />
            Diagonal (45°)
          </label>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || !text || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Aplicando..." : "Adicionar marca d'água"}
      </button>
    </ToolShell>
  );
}
