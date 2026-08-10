"use client";

import { useEffect, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("editar-pdf")!;
const SCALE = 1.3;

type El =
  | { id: number; page: number; type: "text"; cx: number; cy: number; text: string; size: number; color: string }
  | { id: number; page: number; type: "image"; cx: number; cy: number; w: number; img: HTMLImageElement; bytes: Uint8Array; isPng: boolean };

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export default function EditPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [els, setEls] = useState<El[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageSizes = useRef<Record<number, { w: number; h: number }>>({});
  const idc = useRef(1);

  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);

  // Render the page.
  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (files.length === 0) return;
      try {
        const { pdfjsLib } = await import("@/lib/pdfjs");
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await files[0].arrayBuffer()) }).promise;
        if (cancelled) return;
        setNumPages(doc.numPages);
        const pg = await doc.getPage(Math.min(page, doc.numPages));
        const vp = pg.getViewport({ scale: SCALE });
        const base = baseRef.current!;
        const overlay = overlayRef.current!;
        base.width = overlay.width = vp.width;
        base.height = overlay.height = vp.height;
        pageSizes.current[page] = { w: vp.width / SCALE, h: vp.height / SCALE };
        await pg.render({ canvasContext: base.getContext("2d")!, viewport: vp }).promise;
        redraw();
      } catch (e) {
        if (!cancelled) setError("Não foi possível abrir o PDF.");
        console.error(e);
      }
    };
    render();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, page]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => redraw(), [els, selected]);

  const redraw = () => {
    const o = overlayRef.current;
    if (!o) return;
    const ctx = o.getContext("2d")!;
    ctx.clearRect(0, 0, o.width, o.height);
    for (const el of els.filter((e) => e.page === page)) {
      if (el.type === "text") {
        ctx.font = `${el.size * SCALE}px Verdana, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillStyle = el.color;
        ctx.fillText(el.text || " ", el.cx, el.cy);
      } else {
        const h = el.w * (el.img.height / el.img.width);
        ctx.drawImage(el.img, el.cx, el.cy, el.w * SCALE, h * SCALE);
      }
      if (el.id === selected) {
        const b = bounds(el, ctx);
        ctx.strokeStyle = "#465EFF";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
        ctx.setLineDash([]);
      }
    }
  };

  const bounds = (el: El, ctx: CanvasRenderingContext2D) => {
    if (el.type === "text") {
      ctx.font = `${el.size * SCALE}px Verdana, sans-serif`;
      const w = ctx.measureText(el.text || " ").width;
      return { x: el.cx, y: el.cy, w, h: el.size * SCALE };
    }
    return { x: el.cx, y: el.cy, w: el.w * SCALE, h: el.w * SCALE * (el.img.height / el.img.width) };
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const o = overlayRef.current!;
    const r = o.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * o.width, y: ((e.clientY - r.top) / r.height) * o.height };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    const ctx = overlayRef.current!.getContext("2d")!;
    const hit = [...els].reverse().find((el) => {
      if (el.page !== page) return false;
      const b = bounds(el, ctx);
      return p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4;
    });
    if (hit) {
      setSelected(hit.id);
      drag.current = { id: hit.id, dx: p.x - hit.cx, dy: p.y - hit.cy };
    } else {
      setSelected(null);
    }
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const p = pos(e);
    setEls((list) => list.map((el) => (el.id === drag.current!.id ? { ...el, cx: p.x - drag.current!.dx, cy: p.y - drag.current!.dy } : el)));
  };
  const up = () => (drag.current = null);

  const addText = () => {
    const id = idc.current++;
    setEls((l) => [...l, { id, page, type: "text", cx: 60, cy: 60, text: "Texto", size: 16, color: "#282313" }]);
    setSelected(id);
  };

  const addImage = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const img = new Image();
    const isPng = file.type.includes("png");
    img.onload = () => {
      const id = idc.current++;
      setEls((l) => [...l, { id, page, type: "image", cx: 60, cy: 60, w: 160, img, bytes, isPng }]);
      setSelected(id);
    };
    img.src = URL.createObjectURL(file);
  };

  const sel = els.find((e) => e.id === selected) || null;
  const updateSel = (patch: Partial<El>) =>
    setEls((l) => l.map((e) => (e.id === selected ? ({ ...e, ...patch } as El) : e)));
  const removeSel = () => {
    setEls((l) => l.filter((e) => e.id !== selected));
    setSelected(null);
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      for (const el of els) {
        const p = pages[el.page - 1];
        if (!p) continue;
        const { height } = p.getSize();
        if (el.type === "text") {
          const size = el.size;
          p.drawText(el.text, {
            x: el.cx / SCALE,
            y: height - el.cy / SCALE - size,
            size,
            font,
            color: hexToRgb(el.color),
          });
        } else {
          const embedded = el.isPng ? await doc.embedPng(el.bytes) : await doc.embedJpg(el.bytes);
          const w = el.w;
          const h = w * (el.img.height / el.img.width);
          p.drawImage(embedded, { x: el.cx / SCALE, y: height - el.cy / SCALE - h, width: w, height: h });
        }
      }
      downloadBlob(await doc.save(), "editado.pdf");
    } catch (e) {
      setError("Não foi possível gerar o PDF editado.");
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
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={addText} className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white">+ Texto</button>
            <button onClick={() => imgInput.current?.click()} className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700">+ Imagem</button>
            <input ref={imgInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { if (e.target.files?.[0]) addImage(e.target.files[0]); e.target.value = ""; }} />
            <span className="mx-2 h-4 w-px bg-gray-200" />
            <button disabled={page <= 1} onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelected(null); }} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40">←</button>
            <span className="text-gray-600">Pág. {page}/{numPages || "?"}</span>
            <button disabled={numPages > 0 && page >= numPages} onClick={() => { setPage((p) => p + 1); setSelected(null); }} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40">→</button>
          </div>

          {sel && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-3 text-sm">
              {sel.type === "text" && (
                <>
                  <label>
                    <span className="mb-1 block text-gray-600">Texto</span>
                    <input value={sel.text} onChange={(e) => updateSel({ text: e.target.value })} className="rounded-lg border border-gray-300 px-2 py-1" />
                  </label>
                  <label>
                    <span className="mb-1 block text-gray-600">Tam. {sel.size}</span>
                    <input type="range" min={8} max={72} value={sel.size} onChange={(e) => updateSel({ size: Number(e.target.value) })} />
                  </label>
                  <label>
                    <span className="mb-1 block text-gray-600">Cor</span>
                    <input type="color" value={sel.color} onChange={(e) => updateSel({ color: e.target.value })} className="h-8 w-10 rounded border border-gray-300" />
                  </label>
                </>
              )}
              {sel.type === "image" && (
                <label>
                  <span className="mb-1 block text-gray-600">Largura {Math.round(sel.w)}pt</span>
                  <input type="range" min={40} max={480} value={sel.w} onChange={(e) => updateSel({ w: Number(e.target.value) })} />
                </label>
              )}
              <button onClick={removeSel} className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-brand">Remover</button>
            </div>
          )}

          <p className="text-xs text-gray-400">Clique num elemento para selecionar e arraste para posicionar.</p>
          <div className="relative inline-block max-w-full overflow-auto">
            <canvas ref={baseRef} className="block max-w-full" />
            <canvas ref={overlayRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} className="absolute left-0 top-0 max-w-full cursor-move touch-none" />
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || els.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Gerando..." : "Baixar PDF editado"}
      </button>
    </ToolShell>
  );
}
