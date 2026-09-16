"use client";

import { getTool } from "@/lib/tools";
import { BackendTool } from "@/components/BackendTool";

const tool = getTool("pdf-para-csv")!;

export default function Page() {
  return (
    <BackendTool
      tool={tool}
      hint="Selecione um PDF com tabela"
      buttonLabel="Converter para CSV"
      responseKind="download"
      withPassword
      build={(files, password) => {
        const fd = new FormData();
        fd.append("file", files[0]);
        if (password) fd.append("password", password);
        return {
          url: "/api/pdf-to-csv",
          init: { body: fd },
          downloadName: files[0].name.replace(/\.pdf$/i, "") + ".csv",
        };
      }}
    />
  );
}
