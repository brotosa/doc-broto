"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("word-para-pdf")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      accept=".doc,.docx,.odt,.rtf"
      hint="Selecione um arquivo Word (.doc, .docx)"
      buttonLabel="Converter para PDF"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: "/api/office-to-pdf", init: { body: fd }, downloadName: "documento.pdf" };
      }}
    />
  );
}
