"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("resumir-com-ia")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF"
      buttonLabel="Resumir com IA"
      responseKind="json"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: "/api/ai/resumir", init: { body: fd } };
      }}
    />
  );
}
