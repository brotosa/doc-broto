"use client";

import { useEffect, useRef, useState } from "react";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";

const tool = getTool("comparar-pdf")!;

export default function ComparePage() {
  const [a, setA] = useState<File[]>([]);
  const [b, setB] = useState<File[]>([]);
  const [page, setPage] = useState(1);
  const [maxPages, setMaxPages] = useState(0);
  const [diffPct, setDiffPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasA = useRef<HTMLCanvasElement>(null);
  const canvasB = useRef<HTMLCanvasElement>(null);
  const canvasD = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (a.length === 0 || b.length === 0) return;
      setBusy(true);
      setError(null);
      try {
        const { pdfjsLib } = await import("@/lib/pdfjs");
        const [docA, docB] = await Promise.all([
          pdfjsLib.getDocument({ data: new Uint8Array(await a[0].arrayBuffer()) }).promise,
          pdfjsLib.getDocument({ data: new Uint8Array(await b[0].arrayBuffer()) }).promise,
        ]);
        if (cancelled) return;
        setMaxPages(Math.max(docA.numPages, docB.numPages));
        const scale = 1.3;

        const draw = async (doc: any, canvas: HTMLCanvasElement) => {
          const ctx = canvas.getContext("2d")!;
          if (page > doc.numPages) {
            canvas.width = 10;
            canvas.height = 10;
            ctx.clearRect(0, 0, 10, 10);
            return null;
          }
          const pg = await doc.getPage(page);
          const vp = pg.getViewport({ scale });
          canvas.width = vp.width;
          canvas.height = vp.height;
          await pg.render({ canvasContext: ctx, viewport: vp }).promise;
          return ctx.getImageData(0, 0, canvas.width, canvas.height);
        };

        const imgA = await draw(docA, canvasA.current!);
        const imgB = await draw(docB, canvasB.current!);

        // Pixel diff onto canvasD (based on B's dimensions).
        const d = canvasD.current!;
        if (imgA && imgB && imgA.width === imgB.width && imgA.height === imgB.height) {
          d.width = imgB.width;
          d.height = imgB.height;
          const ctx = d.getContext("2d")!;
          const out = ctx.createImageData(imgB.width, imgB.height);
          let changed = 0;
          for (let i = 0; i < imgB.data.length; i += 4) {
            const dr = Math.abs(imgA.data[i] - imgB.data[i]);
            const dg = Math.abs(imgA.data[i + 1] - imgB.data[i + 1]);
            const db = Math.abs(imgA.data[i + 2] - imgB.data[i + 2]);
            const diff = dr + dg + db > 60;
            if (diff) {
              changed++;
              out.data[i] = 0xe5;
              out.data[i + 1] = 0x32;
              out.data[i + 2] = 0x2d;
              out.data[i + 3] = 255;
            } else {
              // faded original for context
              const g = 0.9 * imgB.data[i] + 25;
              out.data[i] = out.data[i + 1] = out.data[i + 2] = Math.min(255, g);
              out.data[i + 3] = 255;
            }
          }
          ctx.putImageData(out, 0, 0);
          setDiffPct((changed / (imgB.width * imgB.height)) * 100);
        } else {
          const ctx = d.getContext("2d")!;
          d.width = 300;
          d.height = 60;
          ctx.clearRect(0, 0, 300, 60);
          setDiffPct(null);
        }
      } catch (e) {
        if (!cancelled) setError("Não foi possível comparar os PDFs.");
        console.error(e);
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [a, b, page]);

  const ready = a.length > 0 && b.length > 0;

  return (
    <ToolShell tool={tool}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-600">Documento A (original)</p>
          <FileDropzone files={a} onFiles={setA} hint="PDF original" />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-600">Documento B (novo)</p>
          <FileDropzone files={b} onFiles={setB} hint="PDF a comparar" />
        </div>
      </div>

      {ready && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40">← Anterior</button>
            <span className="text-gray-600">Página {page} de {maxPages || "?"}</span>
            <button disabled={maxPages > 0 && page >= maxPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40">Próxima →</button>
            {busy && <span className="text-gray-400">processando…</span>}
            {diffPct != null && (
              <span className={`ml-auto rounded-md px-2 py-1 font-medium ${diffPct < 0.1 ? "bg-brand-green/15 text-brand-green" : "bg-brand/10 text-brand"}`}>
                {diffPct < 0.1 ? "Páginas idênticas" : `${diffPct.toFixed(2)}% de diferença`}
              </span>
            )}
          </div>
          {diffPct == null && !busy && (
            <p className="mb-3 text-sm text-brand">
              As páginas têm tamanhos diferentes — o realce de diferenças fica disponível
              apenas para páginas de mesma dimensão.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { ref: canvasA, label: "A" },
              { ref: canvasB, label: "B" },
              { ref: canvasD, label: "Diferenças" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-2">
                <p className="mb-1 text-center text-xs font-medium text-gray-500">{c.label}</p>
                <canvas ref={c.ref} className="w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
    </ToolShell>
  );
}
