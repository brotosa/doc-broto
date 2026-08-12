"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("achatar-pdf")!;

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const doc = await PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));
      const form = doc.getForm();
      const nFields = form.getFields().length;
      form.flatten(); // congela os campos (viram conteúdo fixo)
      if (nFields === 0) setError("Aviso: nenhum campo de formulário encontrado — o PDF foi apenas regravado.");
      downloadBlob(await doc.save(), files[0].name.replace(/\.pdf$/i, "") + "-achatado.pdf");
    } catch (e) {
      setError("Não foi possível achatar o formulário.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF com formulário" />

      {files.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          Ao achatar, os campos preenchidos viram parte fixa do documento — ninguém mais
          consegue editá-los. Ideal para enviar formulários finalizados.
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Achatando..." : "Achatar e baixar"}
      </button>
    </ToolShell>
  );
}
