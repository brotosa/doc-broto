"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("assinar-pdf")!;

type Corner = "br" | "bl" | "tr" | "tl";

export default function SignPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [corner, setCorner] = useState<Corner>("br");
  const [pageNum, setPageNum] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#282313";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  };
  const end = () => (drawing.current = false);

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
  };

  const run = async () => {
    setError(null);
    if (!hasInk.current) {
      setError("Desenhe sua assinatura no quadro.");
      return;
    }
    setBusy(true);
    try {
      const pngUrl = canvasRef.current!.toDataURL("image/png");
      const pngBytes = await (await fetch(pngUrl)).arrayBuffer();
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      const png = await doc.embedPng(new Uint8Array(pngBytes));
      const pages = doc.getPages();
      const idx = Math.min(Math.max(1, pageNum), pages.length) - 1;
      const page = pages[idx];
      const { width, height } = page.getSize();
      const w = width * 0.28;
      const h = (png.height / png.width) * w;
      const margin = 24;
      const x = corner.endsWith("l") ? margin : width - w - margin;
      const y = corner.startsWith("t") ? height - h - margin : margin;
      page.drawImage(png, { x, y, width: w, height: h });
      downloadBlob(await doc.save(), "assinado.pdf");
    } catch (e) {
      setError("Não foi possível assinar o arquivo.");
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
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600">Sua assinatura</p>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="w-full touch-none rounded-lg border border-dashed border-gray-300 bg-gray-50"
            />
            <button onClick={clear} className="mt-2 text-sm text-brand hover:underline">
              Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">Página</span>
              <input
                type="number"
                min={1}
                value={pageNum}
                onChange={(e) => setPageNum(Number(e.target.value))}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">Posição</span>
              <select
                value={corner}
                onChange={(e) => setCorner(e.target.value as Corner)}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none"
              >
                <option value="br">Inferior direita</option>
                <option value="bl">Inferior esquerda</option>
                <option value="tr">Superior direita</option>
                <option value="tl">Superior esquerda</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={run}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Assinando..." : "Assinar PDF"}
      </button>
    </ToolShell>
  );
}
