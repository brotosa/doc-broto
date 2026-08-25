"use client";

import { getTool } from "@/lib/tools";
import { CombineTool } from "@/components/CombineTool";

const tool = getTool("combinar-pdf")!;

export default function Page() {
  return <CombineTool tool={tool} target="pdf" buttonLabel="Combinar em PDF" downloadName="combinado.pdf" />;
}
