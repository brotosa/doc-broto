"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Tool } from "@/lib/tools";
import { ToolShell } from "./ToolShell";
import { FileDropzone } from "./FileDropzone";
import { useServerAction } from "@/lib/useServerAction";
import { downloadBlob } from "@/lib/download";
import { makeZip } from "@/lib/zip";

type BuildResult =
  | { url: string; init: RequestInit; downloadName?: string }
  | { error: string };

export function BackendTool({
  tool,
  accept = "application/pdf",
  multiple = false,
  hint,
  buttonLabel,
  responseKind,
  build,
  controls,
  minFiles = 1,
  withPassword = false,
  batch = false,
}: {
  tool: Tool;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  buttonLabel: string;
  responseKind: "download" | "json";
  /** Build the request from selected files; return {error} to block. */
  build: (files: File[], password?: string) => BuildResult;
  /** Extra control inputs rendered below the dropzone. */
  controls?: ReactNode;
  minFiles?: number;
  /** Mostra um campo opcional de senha (para PDFs protegidos). */
  withPassword?: boolean;
  /** Processa cada arquivo separadamente e entrega um .zip (1 entrada → 1 saída). */
  batch?: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const { busy, error, result, notice, submit, setError, setNotice } = useServerAction();
  // Estado próprio do modo lote (o useServerAction cuida do caso 1 arquivo).
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const isBatch = batch && multiple && files.length > 1;

  // Barra de progresso animada durante o processamento (o envio é um único
  // request, então avançamos suavemente até ~92% e completamos ao terminar).
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (busy) {
      setProgress(8);
      timer.current = setInterval(() => {
        setProgress((p) => (p < 92 ? p + Math.max(0.5, (92 - p) * 0.06) : p));
      }, 300);
    } else {
      if (timer.current) clearInterval(timer.current);
      setProgress((p) => (p > 0 ? 100 : 0));
      const t = setTimeout(() => setProgress(0), 600);
      return () => clearTimeout(t);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [busy]);

  const onSubmit = async () => {
    if (isBatch && responseKind === "download") {
      await runBatch();
      return;
    }
    const built = build(files, password);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    if (responseKind === "download") {
      await submit(built.url, built.init, {
        kind: "download",
        filename: built.downloadName || "resultado",
      });
    } else {
      await submit(built.url, built.init, { kind: "json" });
    }
  };

  // Processa cada arquivo, junta as saídas num .zip e entrega ao final.
  const runBatch = async () => {
    setError(null);
    setNotice(null);
    setBatchBusy(true);
    const results: { name: string; data: Uint8Array }[] = [];
    const avisos = new Set<string>();
    try {
      for (let i = 0; i < files.length; i++) {
        setBatchMsg(`Processando ${i + 1} de ${files.length}: ${files[i].name}`);
        const built = build([files[i]], password);
        if ("error" in built) throw new Error(`${files[i].name}: ${built.error}`);
        const res = await fetch(built.url, { method: "POST", ...built.init });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(`${files[i].name}: ${data.error || `erro ${res.status}`}`);
        }
        const aviso = res.headers.get("X-Broto-Aviso");
        if (aviso) avisos.add(decodeURIComponent(aviso));
        const buf = new Uint8Array(await res.arrayBuffer());
        results.push({ name: built.downloadName || `${files[i].name}.out`, data: buf });
      }
      setBatchMsg("Empacotando em .zip…");
      const zip = makeZip(results);
      downloadBlob(zip, `lote-${tool.slug}.zip`, "application/zip");
      if (avisos.size) setNotice([...avisos].join(" "));
    } catch (e) {
      setError((e as Error).message || "Falha ao processar o lote.");
    } finally {
      setBatchBusy(false);
      setBatchMsg(null);
    }
  };

  const working = busy || batchBusy;

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} multiple={multiple} accept={accept} hint={hint} />

      {files.length > 0 && controls}

      {withPassword && files.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              PDF protegido por senha? <span className="font-normal text-gray-400">(opcional)</span>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              placeholder="Senha do PDF (deixe em branco se não tiver)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>
          <p className="mt-1 text-xs text-gray-400">Se o PDF tiver senha, informe-a aqui para desbloquear e converter num passo só.</p>
        </div>
      )}

      {isBatch && (
        <p className="mt-4 rounded-lg bg-brand/5 px-3 py-2 text-sm text-gray-600">
          <b>{files.length} arquivos</b> selecionados — cada um será processado e você recebe um <b>.zip</b> com todos.
        </p>
      )}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

      {notice && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-brand-yellow bg-brand-yellow/15 px-3 py-2 text-sm text-brand-ink">
          <span aria-hidden>⚠️</span>
          <span>{notice}</span>
        </p>
      )}

      {result != null && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Resultado</span>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="text-sm text-brand hover:underline"
            >
              Copiar
            </button>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
            {result}
          </pre>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={files.length < minFiles || working}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {working ? "Processando..." : isBatch ? `${buttonLabel} (${files.length} → .zip)` : buttonLabel}
      </button>

      {batchBusy && (
        <p className="mt-3 text-center text-xs text-gray-500" aria-live="polite">
          {batchMsg || "Processando lote…"}
        </p>
      )}

      {!batchBusy && (busy || progress > 0) && (
        <div className="mt-3" aria-live="polite">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-gray-500">
            {progress >= 100 ? "Concluído!" : `Convertendo… ${Math.round(progress)}%`}
          </p>
        </div>
      )}
    </ToolShell>
  );
}
