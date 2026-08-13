"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("extrair-texto")!;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const { pdfjsLib } = await import("@/lib/pdfjs");
      const data = new Uint8Array(await files[0].arrayBuffer());
      const doc = await pdfjsLib.getDocument({ data }).promise;
      const parts: string[] = [];

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        // Reconstrói linhas: quebra quando o Y muda de forma perceptível.
        let line = "";
        let lastY: number | null = null;
        const lines: string[] = [];
        for (const it of content.items as Array<{ str: string; transform: number[] }>) {
          const y = it.transform[5];
          if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line.trimEnd()); line = ""; }
          line += it.str;
          lastY = y;
        }
        if (line.trim()) lines.push(line.trimEnd());
        if (doc.numPages > 1) parts.push(`--- Página ${i} ---`);
        parts.push(lines.join("\n"));
        parts.push("");
      }

      const text = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      downloadBlob(blob, files[0].name.replace(/\.pdf$/i, "") + ".txt", "text/plain");
    } catch (e) {
      setError("Não foi possível extrair o texto.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          Extrai o texto selecionável do PDF. Em PDFs escaneados (imagem), use antes o
          <b> OCR</b> ou a ferramenta <b>Imagem para texto</b>.
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Extraindo..." : "Extrair texto (.txt)"}
      </button>
    </ToolShell>
  );
}
