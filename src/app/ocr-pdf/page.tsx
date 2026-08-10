"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("ocr-pdf")!;

const LANGS = [
  { key: "por+eng", label: "Português + Inglês" },
  { key: "por", label: "Português" },
  { key: "eng", label: "Inglês" },
];

export default function Page() {
  const [lang, setLang] = useState("por+eng");

  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF escaneado"
      buttonLabel="Aplicar OCR"
      responseKind="download"
      controls={
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <p className="mb-2 text-sm font-medium text-gray-600">Idioma do documento</p>
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLang(l.key)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${lang === l.key ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      }
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: `/api/ocr?lang=${encodeURIComponent(lang)}`, init: { body: fd }, downloadName: "ocr.pdf" };
      }}
    />
  );
}
