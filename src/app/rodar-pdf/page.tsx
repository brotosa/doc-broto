"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("rodar-pdf")!;

export default function RotatePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes);
        doc.getPages().forEach((p) => {
          const current = p.getRotation().angle;
          p.setRotation(degrees((current + angle) % 360));
        });
        downloadBlob(await doc.save(), file.name.replace(/\.pdf$/i, "") + "-rodado.pdf");
      }
    } catch (e) {
      setError("Não foi possível girar o arquivo.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} multiple hint="Um ou mais PDFs" />

      {files.length > 0 && (
        <div className="mt-6 flex justify-center gap-2">
          {([90, 180, 270] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAngle(a)}
              className={`rounded-lg border px-6 py-3 text-sm font-medium ${angle === a ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
            >
              {a}°
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
        {busy ? "Girando..." : "Rodar PDF"}
      </button>
    </ToolShell>
  );
}
