"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("editar-metadados")!;
type Meta = { title: string; author: string; subject: string; keywords: string };
const EMPTY: Meta = { title: "", author: "", subject: "", keywords: "" };

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [meta, setMeta] = useState<Meta>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!files[0]) { setMeta(EMPTY); return; }
    (async () => {
      try {
        const doc = await PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));
        setMeta({
          title: doc.getTitle() || "",
          author: doc.getAuthor() || "",
          subject: doc.getSubject() || "",
          keywords: doc.getKeywords() || "",
        });
      } catch { setError("Não foi possível abrir o PDF."); }
    })();
  }, [files]);

  const set = (k: keyof Meta, v: string) => setMeta((m) => ({ ...m, [k]: v }));

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const doc = await PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));
      doc.setTitle(meta.title);
      doc.setAuthor(meta.author);
      doc.setSubject(meta.subject);
      doc.setKeywords(meta.keywords ? meta.keywords.split(",").map((s) => s.trim()).filter(Boolean) : []);
      downloadBlob(await doc.save(), files[0].name.replace(/\.pdf$/i, "") + "-metadados.pdf");
    } catch (e) {
      setError("Não foi possível salvar os metadados.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Título</span>
            <input className={field} value={meta.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Autor</span>
            <input className={field} value={meta.author} onChange={(e) => set("author", e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Assunto</span>
            <input className={field} value={meta.subject} onChange={(e) => set("subject", e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Palavras-chave</span>
            <input className={field} value={meta.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="separadas por vírgula" />
          </label>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Salvando..." : "Salvar metadados"}
      </button>
    </ToolShell>
  );
}
