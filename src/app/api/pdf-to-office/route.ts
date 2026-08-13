import { readUpload, fileToBuffer, fileResponse, errorResponse } from "@/lib/server/http";
import { pdfToOfficePy } from "@/lib/server/pdf-office";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

const TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export async function POST(request: Request) {
  try {
    const target = new URL(request.url).searchParams.get("target") as
      | "docx"
      | "xlsx"
      | "pptx"
      | null;
    if (!target || !TYPES[target]) throw new ProcessingError("Formato de destino inválido.");
    const file = await readUpload(request, "file", /\.pdf$/i);
    const buf = await fileToBuffer(file);
    const out = await pdfToOfficePy(buf, target);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}.${target}`, TYPES[target]);
  } catch (err) {
    return errorResponse(err);
  }
}
