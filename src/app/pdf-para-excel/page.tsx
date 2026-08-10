"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("pdf-para-excel")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF"
      buttonLabel="Converter para Excel"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: "/api/pdf-to-office?target=xlsx", init: { body: fd }, downloadName: "planilha.xlsx" };
      }}
    />
  );
}
