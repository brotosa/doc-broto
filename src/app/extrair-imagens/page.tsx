"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("extrair-imagens")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF"
      buttonLabel="Extrair imagens"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return {
          url: "/api/pdf-images",
          init: { body: fd },
          downloadName: files[0].name.replace(/\.pdf$/i, "") + "-imagens.zip",
        };
      }}
    />
  );
}
