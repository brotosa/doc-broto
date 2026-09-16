"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("pdf-para-json")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um ou mais PDFs"
      multiple
      batch
      buttonLabel="Converter para JSON"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return {
          url: "/api/pdf-to-json",
          init: { body: fd },
          downloadName: files[0].name.replace(/\.pdf$/i, "") + ".json",
        };
      }}
    />
  );
}
