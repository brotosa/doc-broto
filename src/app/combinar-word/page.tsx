"use client";

import { getTool } from "@/lib/tools";
import { CombineTool } from "@/components/CombineTool";

const tool = getTool("combinar-word")!;

export default function Page() {
  return <CombineTool tool={tool} target="docx" buttonLabel="Combinar em Word" downloadName="combinado.docx" />;
}
