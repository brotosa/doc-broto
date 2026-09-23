import { fileToBuffer, fileResponse, errorResponse, assertUploadSize } from "@/lib/server/http";
import { requireToolAccess } from "@/lib/server/access-guard";
import { unlockPdf } from "@/lib/server/pdf-ops";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    await requireToolAccess("desbloquear-pdf");
    const form = await request.formData();
    const file = form.get("file");
    const password = String(form.get("password") || "");
    if (!(file instanceof File)) throw new ProcessingError("Arquivo ausente.");
    await assertUploadSize(file.size);
    const out = await unlockPdf(await fileToBuffer(file), password);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}-desbloqueado.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
