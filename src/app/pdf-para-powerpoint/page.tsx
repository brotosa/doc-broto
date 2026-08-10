"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("pdf-para-powerpoint")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF"
      buttonLabel="Converter para PowerPoint"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: "/api/pdf-to-office?target=pptx", init: { body: fd }, downloadName: "apresentacao.pptx" };
      }}
    />
  );
}
