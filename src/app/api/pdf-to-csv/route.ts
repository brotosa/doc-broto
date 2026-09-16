import { fileToBuffer, fileResponse, errorResponse, MAX_UPLOAD_BYTES } from "@/lib/server/http";
import { pdfToOfficePy } from "@/lib/server/pdf-office";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.pdf$/i.test(file.name)) throw new ProcessingError("Envie um arquivo PDF.");
    if (file.size === 0) throw new ProcessingError("Arquivo vazio.");
    if (file.size > MAX_UPLOAD_BYTES) throw new ProcessingError("Arquivo excede o limite de 100 MB.");
    const password = String(form.get("password") ?? "");
    const out = await pdfToOfficePy(await fileToBuffer(file), "csv", password);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}.csv`, "text/csv; charset=utf-8");
  } catch (err) {
    return errorResponse(err);
  }
}
