"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("pdf-para-markdown")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF"
      buttonLabel="Converter para Markdown"
      responseKind="json"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: "/api/ai/markdown", init: { body: fd } };
      }}
    />
  );
}
