"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("pdf-para-html")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF"
      buttonLabel="Converter para HTML"
      responseKind="download"
      build={(files) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        return {
          url: "/api/pdf-to-html",
          init: { body: fd },
          downloadName: files[0].name.replace(/\.pdf$/i, "") + ".html",
        };
      }}
    />
  );
}
