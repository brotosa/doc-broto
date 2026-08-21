"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("organizar-pdf")!;

type Thumb = { index: number; url: string };

export default function OrganizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (files.length === 0) {
        setThumbs([]);
        setOrder([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { pdfjsLib } = await import("@/lib/pdfjs");
        const data = new Uint8Array(await files[0].arrayBuffer());
        const doc = await pdfjsLib.getDocument({ data }).promise;
        const out: Thumb[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          out.push({ index: i - 1, url: canvas.toDataURL() });
        }
        if (!cancelled) {
          setThumbs(out);
          setOrder(out.map((t) => t.index));
        }
      } catch (e) {
        if (!cancelled) setError("Não foi possível ler o PDF.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const [dragPos, setDragPos] = useState<number | null>(null);

  const move = (pos: number, dir: -1 | 1) => {
    const j = pos + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[pos], next[j]] = [next[j], next[pos]];
    setOrder(next);
  };

  const dropAt = (to: number) => {
    if (dragPos === null || dragPos === to) return;
    const next = [...order];
    const [m] = next.splice(dragPos, 1);
    next.splice(to, 0, m);
    setOrder(next);
    setDragPos(null);
  };

  const remove = (pos: number) => setOrder(order.filter((_, i) => i !== pos));

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const src = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, order);
      pages.forEach((p) => out.addPage(p));
      downloadBlob(await out.save(), "organizado.pdf");
    } catch (e) {
      setError("Não foi possível gerar o PDF.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const thumbFor = (index: number) => thumbs.find((t) => t.index === index);

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {loading && <p className="mt-6 text-center text-sm text-gray-500">Gerando miniaturas...</p>}

      {order.length > 0 && (
        <>
        <p className="mt-6 text-sm font-medium text-gray-600">Arraste as páginas para reordenar (ou use as setas):</p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {order.map((index, pos) => {
            const t = thumbFor(index);
            return (
              <div
                key={index}
                draggable
                onDragStart={() => setDragPos(pos)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropAt(pos)}
                onDragEnd={() => setDragPos(null)}
                className={`group relative cursor-move rounded-lg border bg-white p-2 transition ${
                  dragPos === pos ? "border-brand opacity-50" : "border-gray-200 hover:border-brand/40"
                }`}
              >
                {t && <img src={t.url} alt={`Página ${index + 1}`} className="w-full rounded" draggable={false} />}
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>Pág. {index + 1}</span>
                  <span className="flex gap-1">
                    <button onClick={() => move(pos, -1)} className="rounded px-1 hover:bg-gray-100">←</button>
                    <button onClick={() => move(pos, 1)} className="rounded px-1 hover:bg-gray-100">→</button>
                    <button onClick={() => remove(pos)} className="rounded px-1 text-brand hover:bg-brand/10">✕</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={order.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Gerando..." : "Organizar PDF"}
      </button>
    </ToolShell>
  );
}
