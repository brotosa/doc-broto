"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("tons-de-cinza")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF colorido"
      buttonLabel="Converter para tons de cinza"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return {
          url: "/api/grayscale",
          init: { body: fd },
          downloadName: files[0].name.replace(/\.pdf$/i, "") + "-cinza.pdf",
        };
      }}
    />
  );
}
