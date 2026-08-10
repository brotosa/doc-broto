"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("recortar-pdf")!;

export default function CropPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [margins, setMargins] = useState({ top: 5, right: 5, bottom: 5, left: 5 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof margins, v: number) =>
    setMargins((m) => ({ ...m, [k]: v }));

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const l = (margins.left / 100) * width;
        const r = (margins.right / 100) * width;
        const t = (margins.top / 100) * height;
        const b = (margins.bottom / 100) * height;
        const newW = Math.max(1, width - l - r);
        const newH = Math.max(1, height - t - b);
        page.setCropBox(l, b, newW, newH);
      });
      downloadBlob(await doc.save(), "recortado.pdf");
    } catch (e) {
      setError("Não foi possível recortar o arquivo.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-600">
            Margens a recortar (% de cada lado)
          </p>
          {(["top", "right", "bottom", "left"] as const).map((k) => (
            <label key={k} className="block text-sm">
              <span className="mb-1 block capitalize text-gray-600">
                {{ top: "Topo", right: "Direita", bottom: "Base", left: "Esquerda" }[k]}: {margins[k]}%
              </span>
              <input
                type="range"
                min={0}
                max={45}
                value={margins[k]}
                onChange={(e) => set(k, Number(e.target.value))}
                className="w-full"
              />
            </label>
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Recortando..." : "Recortar PDF"}
      </button>
    </ToolShell>
  );
}
