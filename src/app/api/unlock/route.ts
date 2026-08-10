import { fileToBuffer, fileResponse, errorResponse, MAX_UPLOAD_BYTES } from "@/lib/server/http";
import { unlockPdf } from "@/lib/server/pdf-ops";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const password = String(form.get("password") || "");
    if (!(file instanceof File)) throw new ProcessingError("Arquivo ausente.");
    if (file.size > MAX_UPLOAD_BYTES) throw new ProcessingError("Arquivo excede 100 MB.");
    const out = await unlockPdf(await fileToBuffer(file), password);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}-desbloqueado.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
