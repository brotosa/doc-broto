"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("pdf-para-powerpoint")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um ou mais PDFs"
      multiple
      batch
      buttonLabel="Converter para PowerPoint"
      responseKind="download"
      withPassword
      build={(files, password) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        if (password) fd.append("password", password);
        return {
          url: "/api/pdf-to-office?target=pptx",
          init: { body: fd },
          downloadName: files[0].name.replace(/\.pdf$/i, "") + ".pptx",
        };
      }}
    />
  );
}
