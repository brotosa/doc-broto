"use client";

import { useCallback, useRef, useState } from "react";
import { clsx } from "clsx";
import { formatBytes } from "@/lib/download";

export function FileDropzone({
  accept = "application/pdf",
  multiple = false,
  files,
  onFiles,
  hint,
}: {
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const incoming = Array.from(list);
      onFiles(multiple ? [...files, ...incoming] : incoming.slice(0, 1));
    },
    [files, multiple, onFiles]
  );

  const removeAt = (i: number) => onFiles(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
          dragging
            ? "border-brand bg-brand/5"
            : "border-gray-300 bg-white hover:border-brand/50"
        )}
      >
        <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">
          ⬆
        </div>
        <p className="font-medium text-gray-700">
          Arraste os arquivos aqui ou clique para selecionar
        </p>
        <p className="mt-1 text-sm text-gray-400">
          {hint ?? (multiple ? "Você pode adicionar vários arquivos" : "Selecione um arquivo")}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm"
            >
              <span className="truncate pr-3 text-gray-700">{f.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-gray-400">{formatBytes(f.size)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i);
                  }}
                  className="text-gray-400 hover:text-brand"
                  aria-label="Remover arquivo"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
