"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { getTool } from "@/lib/tools";
import { ToolShell } from "@/components/ToolShell";
import { downloadBlob } from "@/lib/download";

const tool = getTool("digitalizar-pdf")!;

export default function ScanPage() {
  const [shots, setShots] = useState<string[]>([]); // JPEG data URLs
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (e) {
      setError("Câmera indisponível neste dispositivo/navegador. Use “Enviar foto”.");
      console.error(e);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setShots((s) => [...s, c.toDataURL("image/jpeg", 0.9)]);
  };

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    for (const f of Array.from(list)) {
      const url: string = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(f);
      });
      setShots((s) => [...s, url]);
    }
  };

  const remove = (i: number) => setShots((s) => s.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= shots.length) return;
    const next = [...shots];
    [next[i], next[j]] = [next[j], next[i]];
    setShots(next);
  };

  const build = async () => {
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      for (const url of shots) {
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const img = url.includes("image/png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      stopCamera();
      downloadBlob(await doc.save(), "digitalizado.pdf");
    } catch (e) {
      setError("Não foi possível gerar o PDF.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={tool}>
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap gap-2">
          {!cameraOn ? (
            <button onClick={startCamera} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
              Abrir câmera
            </button>
          ) : (
            <>
              <button onClick={capture} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
                Capturar
              </button>
              <button onClick={stopCamera} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">
                Parar câmera
              </button>
            </>
          )}
          <button onClick={() => fileInput.current?.click()} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">
            Enviar foto
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>

        {cameraOn && (
          <video ref={videoRef} playsInline muted className="w-full rounded-lg bg-black" />
        )}

        {shots.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-600">{shots.length} página(s)</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {shots.map((s, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s} alt={`Página ${i + 1}`} className="w-full rounded" />
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>{i + 1}</span>
                    <span className="flex gap-1">
                      <button onClick={() => move(i, -1)} className="px-1 hover:bg-gray-100">←</button>
                      <button onClick={() => move(i, 1)} className="px-1 hover:bg-gray-100">→</button>
                      <button onClick={() => remove(i)} className="px-1 text-brand hover:bg-brand/10">✕</button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      <button
        onClick={build}
        disabled={shots.length === 0 || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Gerando..." : "Gerar PDF"}
      </button>
    </ToolShell>
  );
}
