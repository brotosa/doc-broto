"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob, formatBytes } from "@/lib/download";

const tool = getTool("comprimir-pdf")!;

type Level = "extreme" | "recommended" | "less";

const LEVELS: Record<Level, { label: string; scale: number; quality: number }> = {
  less: { label: "Menos compressão", scale: 1.5, quality: 0.85 },
  recommended: { label: "Recomendada", scale: 1.1, quality: 0.7 },
  extreme: { label: "Compressão extrema", scale: 0.9, quality: 0.55 },
};

export default function CompressPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [level, setLevel] = useState<Level>("recommended");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ before: number; after: number } | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { scale, quality } = LEVELS[level];
      const { pdfjsLib } = await import("@/lib/pdfjs");
      const original = new Uint8Array(await files[0].arrayBuffer());
      const doc = await pdfjsLib.getDocument({ data: original.slice() }).promise;
      const out = await PDFDocument.create();

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const jpgBlob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", quality)
        );
        const jpg = await out.embedJpg(new Uint8Array(await jpgBlob.arrayBuffer()));
        const p = out.addPage([viewport.width, viewport.height]);
        p.drawImage(jpg, { x: 0, y: 0, width: viewport.width, height: viewport.height });
      }

      const saved = await out.save();
      setResult({ before: original.length, after: saved.length });
      downloadBlob(saved, files[0].name.replace(/\.pdf$/i, "") + "-comprimido.pdf");
    } catch (e) {
      setError("Não foi possível comprimir o arquivo.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {(Object.keys(LEVELS) as Level[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${level === l ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
            >
              <span>{LEVELS[l].label}</span>
              {level === l && <span>✓</span>}
            </button>
          ))}
          <p className="pt-1 text-xs text-gray-400">
            A compressão converte cada página em imagem. Ideal para documentos
            escaneados. O texto deixa de ser selecionável.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {formatBytes(result.before)} → {formatBytes(result.after)} (
          {Math.max(0, Math.round((1 - result.after / result.before) * 100))}% menor)
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Comprimindo..." : "Comprimir PDF"}
      </button>
    </ToolShell>
  );
}
