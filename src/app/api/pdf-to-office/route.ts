import { fileToBuffer, fileResponse, errorResponse, MAX_UPLOAD_BYTES } from "@/lib/server/http";
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
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.pdf$/i.test(file.name)) throw new ProcessingError("Envie um arquivo PDF.");
    if (file.size === 0) throw new ProcessingError("Arquivo vazio.");
    if (file.size > MAX_UPLOAD_BYTES) throw new ProcessingError("Arquivo excede o limite de 100 MB.");
    const password = String(form.get("password") ?? "");
    const buf = await fileToBuffer(file);
    const out = await pdfToOfficePy(buf, target, password);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}.${target}`, TYPES[target]);
  } catch (err) {
    return errorResponse(err);
  }
}
