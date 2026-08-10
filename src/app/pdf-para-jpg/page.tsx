"use client";

import { useState } from "react";
import JSZip from "jszip";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("pdf-para-jpg")!;

export default function PdfToJpgPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const { pdfjsLib } = await import("@/lib/pdfjs");
      const data = new Uint8Array(await files[0].arrayBuffer());
      const doc = await pdfjsLib.getDocument({ data }).promise;
      const zip = new JSZip();

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: quality });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
        );
        zip.file(`pagina-${i}.jpg`, blob);
      }

      if (doc.numPages === 1) {
        const only = await zip.file("pagina-1.jpg")!.async("blob");
        downloadBlob(only, "pagina-1.jpg", "image/jpeg");
      } else {
        const out = await zip.generateAsync({ type: "blob" });
        downloadBlob(out, "imagens.zip", "application/zip");
      }
    } catch (e) {
      setError("Não foi possível converter o PDF.");
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
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">
              Qualidade: {quality === 1 ? "Normal" : quality === 2 ? "Alta" : "Máxima"}
            </span>
            <input type="range" min={1} max={3} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
          </label>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Convertendo..." : "Converter para JPG"}
      </button>
    </ToolShell>
  );
}
