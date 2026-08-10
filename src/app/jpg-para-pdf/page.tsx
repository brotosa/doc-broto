"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("jpg-para-pdf")!;

export default function JpgToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [orientation, setOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const isPng = file.type.includes("png");
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);

        let w = img.width;
        let h = img.height;
        if (orientation === "landscape" && h > w) [w, h] = [h, w];
        if (orientation === "portrait" && w > h) [w, h] = [h, w];

        const page = doc.addPage([w, h]);
        // Draw fitting the page, preserving aspect ratio.
        const scale = Math.min(page.getWidth() / img.width, page.getHeight() / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        page.drawImage(img, {
          x: (page.getWidth() - dw) / 2,
          y: (page.getHeight() - dh) / 2,
          width: dw,
          height: dh,
        });
      }
      downloadBlob(await doc.save(), "imagens.pdf");
    } catch (e) {
      setError("Não foi possível converter. Use imagens JPG ou PNG válidas.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone
        files={files}
        onFiles={setFiles}
        multiple
        accept="image/jpeg,image/png"
        hint="Adicione imagens JPG ou PNG"
      />

      {files.length > 0 && (
        <div className="mt-6 flex justify-center gap-2">
          {(["auto", "portrait", "landscape"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrientation(o)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${orientation === o ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
            >
              {o === "auto" ? "Automático" : o === "portrait" ? "Retrato" : "Paisagem"}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Convertendo..." : "Converter para PDF"}
      </button>
    </ToolShell>
  );
}
