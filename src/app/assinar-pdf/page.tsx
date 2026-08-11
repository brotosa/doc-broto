"use client";

import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { FileDropzone } from "@/components/FileDropzone";
import { downloadBlob } from "@/lib/download";

const tool = getTool("assinar-pdf")!;
const RENDER_W = 1200; // resolução de renderização das páginas (px) — nitidez no zoom

type Sig = { url: string; w: number; h: number };
type PageImg = { url: string; wPt: number; hPt: number };
type Placement = { id: number; page: number; xr: number; yr: number; wr: number };

export default function SignPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageImg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(900); // largura de exibição (px)

  const [mode, setMode] = useState<"draw" | "text" | "image">("draw");
  const [sig, setSig] = useState<Sig | null>(null);
  const [text, setText] = useState("");

  const [items, setItems] = useState<Placement[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const nextId = useRef(1);

  // ---------- render das páginas ----------
  useEffect(() => {
    if (!files[0]) { setPages([]); setItems([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null); setItems([]);
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

  // ---------- construção da assinatura ----------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const cpos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const dStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true; const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = cpos(e); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const dMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return; const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#282313"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    const { x, y } = cpos(e); ctx.lineTo(x, y); ctx.stroke(); hasInk.current = true;
  };
  const dEnd = () => (drawing.current = false);
  const dClear = () => { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); hasInk.current = false; };

  const useDrawn = () => {
    if (!hasInk.current) { setError("Desenhe sua assinatura no quadro."); return; }
    const c = canvasRef.current!;
    setSig({ url: c.toDataURL("image/png"), w: c.width, h: c.height });
    setError(null);
  };
  const useText = () => {
    if (!text.trim()) { setError("Digite o texto da assinatura."); return; }
    const fontPx = 90, pad = 24;
    const meas = document.createElement("canvas").getContext("2d")!;
    const font = `italic ${fontPx}px 'Segoe Script','Brush Script MT','Comic Sans MS',cursive`;
    meas.font = font;
    const w = Math.ceil(meas.measureText(text).width) + pad * 2;
    const h = fontPx + pad * 2;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d")!; ctx.font = font; ctx.fillStyle = "#282313"; ctx.textBaseline = "middle";
    ctx.fillText(text, pad, h / 2);
    setSig({ url: c.toDataURL("image/png"), w, h }); setError(null);
  };
  const useImage = (f?: File) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setSig({ url: String(reader.result), w: img.naturalWidth, h: img.naturalHeight });
      img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
    setError(null);
  };

  // ---------- posicionar ----------
  const boxHeightRatio = (p: PageImg, wr: number) =>
    sig ? (wr * (sig.h / sig.w)) * (p.wPt / p.hPt) : 0;

  const addAt = (pageIdx: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !sig) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width;
    const cy = (e.clientY - r.top) / r.height;
    const wr = 0.26;
    const hr = boxHeightRatio(pages[pageIdx], wr);
    const id = nextId.current++;
    setItems((it) => [...it, { id, page: pageIdx, xr: clamp(cx - wr / 2, 0, 1 - wr), yr: clamp(cy - hr / 2, 0, 1 - hr), wr }]);
    setSel(id);
  };

  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const boxDown = (it: Placement, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSel(it.id);
    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    dragRef.current = { id: it.id, dx: (e.clientX - parent.left) / parent.width - it.xr, dy: (e.clientY - parent.top) / parent.height - it.yr };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const boxMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current; if (!d) return;
    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const nx = (e.clientX - parent.left) / parent.width - d.dx;
    const ny = (e.clientY - parent.top) / parent.height - d.dy;
    setItems((it) => it.map((p) => {
      if (p.id !== d.id) return p;
      const hr = boxHeightRatio(pages[p.page], p.wr);
      return { ...p, xr: clamp(nx, 0, 1 - p.wr), yr: clamp(ny, 0, 1 - hr) };
    }));
  };
  const boxUp = () => (dragRef.current = null);

  const resize = (wr: number) => setItems((it) => it.map((p) => (p.id === sel ? { ...p, wr } : p)));
  const removeSel = () => { setItems((it) => it.filter((p) => p.id !== sel)); setSel(null); };

  // ---------- aplicar ----------
  const apply = async () => {
    if (!sig) { setError("Crie sua assinatura primeiro."); return; }
    if (!items.length) { setError("Clique no documento para posicionar a assinatura."); return; }
    setBusy(true); setError(null);
    try {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const doc = await PDFDocument.load(bytes);
      const imgBytes = await (await fetch(sig.url)).arrayBuffer();
      const img = sig.url.startsWith("data:image/png") ? await doc.embedPng(imgBytes) : await doc.embedJpg(imgBytes);
      const docPages = doc.getPages();
      for (const it of items) {
        const page = docPages[it.page];
        const { width, height } = page.getSize();
        const w = it.wr * width;
        const h = w * (sig.h / sig.w);
        const x = it.xr * width;
        const y = height - it.yr * height - h;
        page.drawImage(img, { x, y, width: w, height: h });
      }
      downloadBlob(await doc.save(), "assinado.pdf");
    } catch (e) {
      setError("Não foi possível assinar o arquivo.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const tab = (m: typeof mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${mode === m ? "bg-brand text-white" : "bg-gray-100 text-gray-600"}`}
    >
      {label}
    </button>
  );
  const zbtn = "grid h-8 w-8 place-items-center rounded-lg bg-white text-lg font-bold text-gray-700 shadow-sm hover:bg-gray-50";

  return (
    <ToolShell tool={tool} wide>
      <FileDropzone files={files} onFiles={setFiles} hint="Selecione um PDF" />

      {files.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Painel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">Sua assinatura</p>
              <div className="mb-3 flex gap-2">{tab("draw", "Desenhar")}{tab("text", "Digitar")}{tab("image", "Imagem")}</div>

              {mode === "draw" && (
                <div>
                  <canvas
                    ref={canvasRef} width={600} height={200}
                    onPointerDown={dStart} onPointerMove={dMove} onPointerUp={dEnd} onPointerLeave={dEnd}
                    className="w-full touch-none rounded-lg border border-dashed border-gray-300 bg-gray-50"
                  />
                  <div className="mt-2 flex gap-3">
                    <button onClick={useDrawn} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">Usar assinatura</button>
                    <button onClick={dClear} className="text-sm text-gray-500 hover:underline">Limpar</button>
                  </div>
                </div>
              )}
              {mode === "text" && (
                <div className="flex flex-col gap-2">
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Seu nome"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                  <button onClick={useText} className="self-start rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">Usar assinatura</button>
                </div>
              )}
              {mode === "image" && (
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => useImage(e.target.files?.[0])}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
              )}

              {sig && (
                <div className="mt-3 rounded-lg bg-gray-50 p-2">
                  <p className="mb-1 text-xs text-gray-500">Prévia:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sig.url} alt="assinatura" className="max-h-16" />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-700">Como posicionar</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Crie a assinatura acima.</li>
                <li>Use o <b>zoom</b> se precisar ver melhor.</li>
                <li>Clique no documento onde quiser (em várias páginas se quiser).</li>
                <li>Arraste pra ajustar; selecione e mude o tamanho abaixo.</li>
              </ol>
              {sel !== null && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Tamanho da assinatura selecionada</label>
                  <input type="range" min={0.08} max={0.7} step={0.01}
                    value={items.find((p) => p.id === sel)?.wr ?? 0.26}
                    onChange={(e) => resize(Number(e.target.value))} className="w-full" />
                  <button onClick={removeSel} className="mt-1 text-xs font-semibold text-red-600 hover:underline">Remover esta assinatura</button>
                </div>
              )}
              <p className="mt-3 text-xs text-gray-400">{items.length} assinatura(s) posicionada(s).</p>
            </div>
          </div>

          {/* Documento */}
          <div className="overflow-auto rounded-2xl border border-gray-200 bg-gray-100 p-4" style={{ maxHeight: "82vh" }}>
            <div className="sticky top-0 z-20 mb-3 flex items-center justify-center gap-2 rounded-xl bg-white/90 p-2 shadow-sm backdrop-blur">
              <span className="mr-1 text-xs font-medium text-gray-500">Zoom</span>
              <button className={zbtn} onClick={() => setZoom((z) => Math.max(520, z - 150))}>−</button>
              <span className="w-12 text-center text-sm font-semibold text-gray-700">{Math.round((zoom / 900) * 100)}%</span>
              <button className={zbtn} onClick={() => setZoom((z) => Math.min(1800, z + 150))}>+</button>
              <button className="ml-2 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200" onClick={() => setZoom(900)}>Ajustar</button>
            </div>

            {loading && <p className="py-10 text-center text-sm text-gray-500">Abrindo documento…</p>}
            <div className="flex flex-col items-center gap-4">
              {pages.map((p, i) => (
                <div key={i} className="relative shadow-md" style={{ width: zoom, maxWidth: "100%" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`página ${i + 1}`} className="block w-full select-none" draggable={false} />
                  <div className={`absolute inset-0 ${sig ? "cursor-crosshair" : ""}`} onPointerDown={(e) => addAt(i, e)}>
                    {items.filter((it) => it.page === i).map((it) => (
                      <div
                        key={it.id}
                        onPointerDown={(e) => boxDown(it, e)}
                        onPointerMove={boxMove}
                        onPointerUp={boxUp}
                        className={`absolute touch-none ${sel === it.id ? "ring-2 ring-brand" : "ring-1 ring-brand/40"}`}
                        style={{ left: `${it.xr * 100}%`, top: `${it.yr * 100}%`, width: `${it.wr * 100}%`, cursor: "move" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sig!.url} alt="assinatura" className="pointer-events-none block w-full" draggable={false} />
                      </div>
                    ))}
                  </div>
                  <span className="absolute -top-3 left-2 rounded-full bg-white px-2 text-xs text-gray-400 shadow-sm">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={apply}
        disabled={files.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Assinando…" : "Assinar e baixar PDF"}
      </button>
    </ToolShell>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
