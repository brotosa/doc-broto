import { fileToBuffer, fileResponse, errorResponse, assertUploadSize } from "@/lib/server/http";
import { requireToolAccess } from "@/lib/server/access-guard";
import { protectPdf } from "@/lib/server/pdf-ops";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    await requireToolAccess("proteger-pdf");
    const form = await request.formData();
    const file = form.get("file");
    const password = String(form.get("password") || "");
    if (!(file instanceof File)) throw new ProcessingError("Arquivo ausente.");
    await assertUploadSize(file.size);
    if (!password) throw new ProcessingError("Informe uma senha.");
    const out = await protectPdf(await fileToBuffer(file), password);
    const base = file.name.replace(/\.pdf$/i, "");
    return fileResponse(out, `${base}-protegido.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
