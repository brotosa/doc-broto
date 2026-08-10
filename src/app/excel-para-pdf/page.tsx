"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("excel-para-pdf")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      accept=".xls,.xlsx,.ods,.csv"
      hint="Selecione um arquivo Excel (.xls, .xlsx)"
      buttonLabel="Converter para PDF"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: "/api/office-to-pdf", init: { body: fd }, downloadName: "planilha.pdf" };
      }}
    />
  );
}
