"use client";

import { useEffect, useRef, useState } from "react";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";

const tool = getTool("comparar-pdf")!;

type Seg = { t: "eq" | "del" | "ins"; s: string };

// Diff por LCS (Longest Common Subsequence) sobre tokens.
function diffTokens(A: string[], B: string[]): Seg[] {
  const n = A.length, m = B.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: Seg[] = [];
  let i = 0, j = 0;
  const push = (t: Seg["t"], s: string) => {
    const last = out[out.length - 1];
    if (last && last.t === t) last.s += s;
    else out.push({ t, s });
  };
  while (i < n && j < m) {
    if (A[i] === B[j]) { push("eq", A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("del", A[i]); i++; }
    else { push("ins", B[j]); j++; }
  }
  while (i < n) push("del", A[i++]);
  while (j < m) push("ins", B[j++]);
  return out;
}

export default function ComparePage() {
  const [a, setA] = useState<File[]>([]);
  const [b, setB] = useState<File[]>([]);
  const [page, setPage] = useState(1);
  const [maxPages, setMaxPages] = useState(0);
  const [diffPct, setDiffPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textDiff, setTextDiff] = useState<Seg[] | null>(null);
  const [textBusy, setTextBusy] = useState(false);
  const [textNote, setTextNote] = useState("");
  const [lineMode, setLineMode] = useState(false);

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

  async function extractText(file: File): Promise<string> {
    const { pdfjsLib } = await import("@/lib/pdfjs");
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const c = await pg.getTextContent();
      let line = "";
      let lastY: number | null = null;
      for (const it of c.items as Array<{ str: string; transform: number[] }>) {
        const y = it.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 3) { out += line.trimEnd() + "\n"; line = ""; }
        line += it.str;
        lastY = y;
      }
      out += line.trimEnd() + "\n";
    }
    return out.trim();
  }

  async function runTextDiff() {
    setTextBusy(true);
    setTextNote("");
    setTextDiff(null);
    try {
      const [ta, tb] = await Promise.all([extractText(a[0]), extractText(b[0])]);
      if (!ta && !tb) {
        setTextNote("Nenhum texto selecionável (PDFs escaneados). Use o realce visual acima ou passe antes pelo OCR.");
        return;
      }
      // Palavra a palavra; se muito grande, cai para comparação por linha.
      let A = ta.split(/(\s+)/).filter((t) => t.length);
      let B = tb.split(/(\s+)/).filter((t) => t.length);
      let line = false;
      if (A.length > 3500 || B.length > 3500) {
        A = ta.split(/\n/);
        B = tb.split(/\n/);
        line = true;
        if (A.length > 8000 || B.length > 8000) {
          setTextNote("Documento muito grande para comparar o texto — use o realce visual acima.");
          return;
        }
        setTextNote("Documento grande — comparação feita por linha.");
      }
      setLineMode(line);
      setTextDiff(diffTokens(A, B));
    } catch (e) {
      setTextNote("Não foi possível comparar o texto.");
      console.error(e);
    } finally {
      setTextBusy(false);
    }
  }

  const ready = a.length > 0 && b.length > 0;
  const diffStats = textDiff
    ? {
        add: textDiff.filter((s) => s.t === "ins").reduce((n, s) => n + (lineMode ? 1 : s.s.trim().split(/\s+/).filter(Boolean).length), 0),
        del: textDiff.filter((s) => s.t === "del").reduce((n, s) => n + (lineMode ? 1 : s.s.trim().split(/\s+/).filter(Boolean).length), 0),
      }
    : null;

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

          {/* Diferenças de TEXTO (palavra a palavra) */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Diferenças de texto</h3>
              <button
                onClick={runTextDiff}
                disabled={textBusy}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {textBusy ? "Comparando…" : textDiff ? "Recomparar texto" : "Comparar texto"}
              </button>
              {diffStats && (
                <span className="ml-auto flex items-center gap-2 text-xs">
                  <span className="rounded bg-red-50 px-2 py-1 font-medium text-red-600">− {diffStats.del} {lineMode ? "linha(s)" : "palavra(s)"} removida(s)</span>
                  <span className="rounded bg-green-50 px-2 py-1 font-medium text-green-700">+ {diffStats.add} adicionada(s)</span>
                </span>
              )}
            </div>
            {textNote && <p className="mb-3 text-sm text-gray-500">{textNote}</p>}
            {textDiff && (
              <>
                <div className="mb-2 flex gap-4 text-xs text-gray-500">
                  <span><span className="rounded bg-red-100 px-1 text-red-700 line-through">vermelho</span> = removido (A)</span>
                  <span><span className="rounded bg-green-100 px-1 text-green-800">verde</span> = adicionado (B)</span>
                </div>
                <div className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700">
                  {textDiff.map((s, i) =>
                    s.t === "eq" ? (
                      <span key={i}>{s.s}{lineMode ? "\n" : ""}</span>
                    ) : s.t === "del" ? (
                      <span key={i} className="rounded bg-red-100 text-red-700 line-through">{s.s}{lineMode ? "\n" : ""}</span>
                    ) : (
                      <span key={i} className="rounded bg-green-100 text-green-800">{s.s}{lineMode ? "\n" : ""}</span>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}
    </ToolShell>
  );
}
