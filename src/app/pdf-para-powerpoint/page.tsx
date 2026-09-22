"use client";

import { useState } from "react";
import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("pdf-para-powerpoint")!;

export default function Page() {
  const [modo, setModo] = useState<"editavel" | "imagem">("editavel");

  return (
    <BackendTool
      tool={tool}
      hint="Selecione um ou mais PDFs"
      multiple
      batch
      withPassword
      passwordLabel="PDF protegido por senha?"
      buttonLabel="Converter para PowerPoint"
      responseKind="download"
      controls={
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Modo de conversão</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm ${modo === "editavel" ? "border-brand ring-1 ring-brand" : "border-gray-200"}`}>
              <span className="flex items-center gap-2 font-semibold text-gray-800">
                <input type="radio" name="modo" checked={modo === "editavel"} onChange={() => setModo("editavel")} />
                Fiel e editável <span className="rounded bg-brand-green/15 px-1.5 text-[10px] font-bold text-brand-green">recomendado</span>
              </span>
              <span className="text-xs text-gray-500">Mantém fotos, formas e o design idênticos ao PDF, e deixa o texto editável no PowerPoint. Melhor dos dois mundos.</span>
            </label>
            <label className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm ${modo === "imagem" ? "border-brand ring-1 ring-brand" : "border-gray-200"}`}>
              <span className="flex items-center gap-2 font-semibold text-gray-800">
                <input type="radio" name="modo" checked={modo === "imagem"} onChange={() => setModo("imagem")} />
                Só imagem
              </span>
              <span className="text-xs text-gray-500">Cada página vira uma imagem — aparência idêntica, mas nada é editável. Útil quando você só quer o visual.</span>
            </label>
          </div>
        </div>
      }
      build={(files, password) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        if (password) fd.append("password", password);
        fd.append("fidelity", modo === "editavel" ? "editavel" : "imagem");
        return {
          url: "/api/pdf-to-office?target=pptx",
          init: { body: fd },
          downloadName: files[0].name.replace(/\.pdf$/i, "") + ".pptx",
        };
      }}
    />
  );
}
