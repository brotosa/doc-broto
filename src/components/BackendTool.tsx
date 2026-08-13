"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Tool } from "@/lib/tools";
import { ToolShell } from "./ToolShell";
import { FileDropzone } from "./FileDropzone";
import { useServerAction } from "@/lib/useServerAction";

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
}: {
  tool: Tool;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  buttonLabel: string;
  responseKind: "download" | "json";
  /** Build the request from selected files; return {error} to block. */
  build: (files: File[]) => BuildResult;
  /** Extra control inputs rendered below the dropzone. */
  controls?: ReactNode;
  minFiles?: number;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const { busy, error, result, submit, setError } = useServerAction();

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
    const built = build(files);
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

  return (
    <ToolShell tool={tool}>
      <FileDropzone files={files} onFiles={setFiles} multiple={multiple} accept={accept} hint={hint} />

      {files.length > 0 && controls}

      {error && <p className="mt-4 text-sm text-brand">{error}</p>}

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
        disabled={files.length < minFiles || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Convertendo..." : buttonLabel}
      </button>

      {(busy || progress > 0) && (
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
