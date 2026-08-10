"use client";

import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("ocultar-pdf")!;

type Rect = { x: number; y: number; w: number; h: number };

export default function RedactPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [rects, setRects] = useState<Rect[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseRef = useRef<HTMLCanvasElement>(null); // rendered page
  const overlayRef = useRef<HTMLCanvasElement>(null); // drawing
  const start = useRef<{ x: number; y: number } | null>(null);
  const scaleRef = useRef(1);

  // Render the selected page whenever file/page changes.
  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (files.length === 0) return;
      setError(null);
      setRects([]);
      try {
        const { pdfjsLib } = await import("@/lib/pdfjs");
        const data = new Uint8Array(await files[0].arrayBuffer());
        const doc = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;
        setNumPages(doc.numPages);
        const page = await doc.getPage(Math.min(pageNum, doc.numPages));
        const viewport = page.getViewport({ scale: 1.5 });
        scaleRef.current = 1.5;
        const base = baseRef.current!;
        const overlay = overlayRef.current!;
        base.width = overlay.width = viewport.width;
        base.height = overlay.height = viewport.height;
        overlay.getContext("2d")!.clearRect(0, 0, overlay.width, overlay.height);
        await page.render({ canvasContext: base.getContext("2d")!, viewport }).promise;
      } catch (e) {
        if (!cancelled) setError("Não foi possível abrir o PDF.");
        console.error(e);
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [files, pageNum]);

  const redraw = (list: Rect[]) => {
    const o = overlayRef.current!;
    const ctx = o.getContext("2d")!;
    ctx.clearRect(0, 0, o.width, o.height);
    ctx.fillStyle = "rgba(40,35,19,0.85)";
    list.forEach((r) => ctx.fillRect(r.x, r.y, r.w, r.h));
  };

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const o = overlayRef.current!;
    const rect = o.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * o.width,
      y: ((e.clientY - rect.top) / rect.height) * o.height,
    };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    start.current = toCanvas(e);
  };
  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!start.current) return;
    const p = toCanvas(e);
    const preview = { x: Math.min(start.current.x, p.x), y: Math.min(start.current.y, p.y), w: Math.abs(p.x - start.current.x), h: Math.abs(p.y - start.current.y) };
    redraw([...rects, preview]);
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!start.current) return;
    const p = toCanvas(e);
    const r = { x: Math.min(start.current.x, p.x), y: Math.min(start.current.y, p.y), w: Math.abs(p.x - start.current.x), h: Math.abs(p.y - start.current.y) };
    start.current = null;
    if (r.w > 3 && r.h > 3) {
      const next = [...rects, r];
      setRects(next);
      redraw(next);
    }
  };

  const run = async () => {
    setError(null);
    if (rects.length === 0) {
      setError("Desenhe ao menos uma área para ocultar.");
      return;
    }
    setBusy(true);
    try {
      // Burn the boxes into the rendered page, then flatten that page to an image.
      const base = baseRef.current!;
      const merged = document.createElement("canvas");
      merged.width = base.width;
      merged.height = base.height;
      const ctx = merged.getContext("2d")!;
      ctx.drawImage(base, 0, 0);
      ctx.fillStyle = "#282313";
      rects.forEach((r) => ctx.fillRect(r.x, r.y, r.w, r.h));
      const jpgBlob: Blob = await new Promise((res) =>
        merged.toBlob((b) => res(b!), "image/jpeg", 0.92)
      );

      const srcBytes = new Uint8Array(await files[0].arrayBuffer());
      const src = await PDFDocument.load(srcBytes);
      const out = await PDFDocument.create();
      const jpg = await out.embedJpg(new Uint8Array(await jpgBlob.arrayBuffer()));
      const targetIdx = Math.min(pageNum, src.getPageCount()) - 1;

      for (let i = 0; i < src.getPageCount(); i++) {
        if (i === targetIdx) {
          const { width, height } = src.getPage(i).getSize();
          const p = out.addPage([width, height]);
          p.drawImage(jpg, { x: 0, y: 0, width, height });
        } else {
          const [copied] = await out.copyPages(src, [i]);
          out.addPage(copied);
        }
      }
      downloadBlob(await out.save(), "ocultado.pdf");
    } catch (e) {
      setError("Não foi possível processar o arquivo.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Arraste sobre o conteúdo para criar tarjas. O texto sob a tarja é
              destruído (redação real) na página processada.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              disabled={pageNum <= 1}
              onClick={() => setPageNum((n) => Math.max(1, n - 1))}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-gray-600">Página {pageNum} de {numPages || "?"}</span>
            <button
              disabled={numPages > 0 && pageNum >= numPages}
              onClick={() => setPageNum((n) => n + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
            >
              Próxima →
            </button>
            <button
              onClick={() => { setRects([]); redraw([]); }}
              className="ml-auto text-brand hover:underline"
            >
              Limpar tarjas
            </button>
          </div>
          <div className="relative inline-block max-w-full overflow-auto">
            <canvas ref={baseRef} className="block max-w-full" />
            <canvas
              ref={overlayRef}
              onPointerDown={down}
              onPointerMove={moveDraw}
              onPointerUp={up}
              className="absolute left-0 top-0 max-w-full cursor-crosshair touch-none"
            />
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Processando..." : "Ocultar e baixar"}
      </button>
    </ToolShell>
  );
}
