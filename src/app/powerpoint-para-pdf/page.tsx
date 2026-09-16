"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("powerpoint-para-pdf")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      accept=".ppt,.pptx,.odp"
      hint="Selecione um ou mais arquivos PowerPoint (.ppt, .pptx)"
      multiple
      batch
      withPassword
      passwordLabel="Arquivo protegido por senha?"
      buttonLabel="Converter para PDF"
      responseKind="download"
      build={(files, password) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        if (password) fd.append("password", password);
        return {
          url: "/api/office-to-pdf",
          init: { body: fd },
          downloadName: files[0].name.replace(/\.[^.]+$/, "") + ".pdf",
        };
      }}
    />
  );
}
