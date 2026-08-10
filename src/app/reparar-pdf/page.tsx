"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("reparar-pdf")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF danificado"
      buttonLabel="Reparar PDF"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return { url: "/api/repair", init: { body: fd }, downloadName: "reparado.pdf" };
      }}
    />
  );
}
