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
      withPassword
      build={(files, password) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        if (password) fd.append("password", password);
        return { url: "/api/pdf-to-office?target=xlsx", init: { body: fd }, downloadName: "planilha.xlsx" };
      }}
    />
  );
}
