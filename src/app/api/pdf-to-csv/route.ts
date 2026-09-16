import { fileToBuffer, fileResponse, errorResponse, assertUploadSize } from "@/lib/server/http";
import { pdfToOfficePy } from "@/lib/server/pdf-office";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.pdf$/i.test(file.name)) throw new ProcessingError("Envie um arquivo PDF.");
    await assertUploadSize(file.size);
    const password = String(form.get("password") ?? "");
    const { out, scanned } = await pdfToOfficePy(await fileToBuffer(file), "csv", password);
    const base = file.name.replace(/\.pdf$/i, "");
    const aviso = scanned
      ? "Este PDF parece ser escaneado (imagem). A tabela pode não ser detectada — use “OCR de PDF” antes para torná-lo pesquisável."
      : undefined;
    return fileResponse(out, `${base}.csv`, "text/csv; charset=utf-8", aviso);
  } catch (err) {
    return errorResponse(err);
  }
}
