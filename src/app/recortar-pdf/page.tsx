"use client";

import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("recortar-pdf")!;
const RENDER_W = 1000; // resolução de render das páginas (px)

type PageImg = { url: string; wPt: number; hPt: number };

export default function CropPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageImg[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [margins, setMargins] = useState({ top: 5, right: 5, bottom: 5, left: 5 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof margins, v: number) =>
    setMargins((m) => ({ ...m, [k]: v }));

  // ---------- render das páginas para a prévia ----------
  useEffect(() => {
    if (!files[0]) { setPages([]); setCurrent(0); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null); setCurrent(0);
      try {
        const { pdfjsLib } = await import("@/lib/pdfjs");
        const data = new Uint8Array(await files[0].arrayBuffer());
        const doc = await pdfjsLib.getDocument({ data }).promise;
        const out: PageImg[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: RENDER_W / base.width });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          out.push({ url: canvas.toDataURL("image/jpeg", 0.85), wPt: base.width, hPt: base.height });
        }
        if (!cancelled) setPages(out);
      } catch (e) {
        if (!cancelled) setError("Não foi possível abrir o PDF.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [files]);

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

  const p = pages[current];

  return (
    <ToolShell tool={tool} wide>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Painel de margens */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="mb-1 text-sm font-semibold text-gray-700">Margens a recortar</p>
              <p className="mb-4 text-xs text-gray-400">
                A área escurecida na prévia é o que será removido. O recorte vale para todas as páginas.
              </p>
              {(["top", "right", "bottom", "left"] as const).map((k) => (
                <label key={k} className="mb-3 block text-sm last:mb-0">
                  <span className="mb-1 flex items-center justify-between text-gray-600">
                    <span>{{ top: "Topo", right: "Direita", bottom: "Base", left: "Esquerda" }[k]}</span>
                    <span className="font-semibold text-gray-800">{margins[k]}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={45}
                    value={margins[k]}
                    onChange={(e) => set(k, Number(e.target.value))}
                    className="w-full accent-brand"
                  />
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={run}
              disabled={busy}
              className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Recortando…" : "Recortar e baixar PDF"}
            </button>
          </div>

          {/* Prévia do documento */}
          <div className="overflow-auto rounded-2xl border border-gray-200 bg-gray-100 p-4" style={{ maxHeight: "82vh" }}>
            {pages.length > 1 && (
              <div className="sticky top-0 z-20 mb-3 flex items-center justify-center gap-3 rounded-xl bg-white/90 p-2 shadow-sm backdrop-blur">
                <button
                  className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  disabled={current === 0}
                >
                  ← Anterior
                </button>
                <span className="text-sm font-semibold text-gray-700">Página {current + 1} de {pages.length}</span>
                <button
                  className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                  onClick={() => setCurrent((c) => Math.min(pages.length - 1, c + 1))}
                  disabled={current >= pages.length - 1}
                >
                  Próxima →
                </button>
              </div>
            )}

            {loading && <p className="py-10 text-center text-sm text-gray-500">Abrindo documento…</p>}

            {p && (
              <div className="flex justify-center">
                <div className="relative shadow-md" style={{ width: 640, maxWidth: "100%" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`página ${current + 1}`} className="block w-full select-none" draggable={false} />
                  {/* Área que permanece; o box-shadow escurece o que será cortado */}
                  <div
                    className="absolute border-2 border-dashed border-brand"
                    style={{
                      left: `${margins.left}%`,
                      top: `${margins.top}%`,
                      right: `${margins.right}%`,
                      bottom: `${margins.bottom}%`,
                      boxShadow: "0 0 0 9999px rgba(15,23,42,0.45)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ToolShell>
  );
}
