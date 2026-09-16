import { fileToBuffer, fileResponse, errorResponse, assertUploadSize } from "@/lib/server/http";
import { officeToPdf } from "@/lib/server/pdf-ops";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

const ACCEPT = /\.(docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|csv)$/i;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !ACCEPT.test(file.name)) {
      throw new ProcessingError("Envie um arquivo Word, Excel ou PowerPoint.");
    }
    await assertUploadSize(file.size);
    const password = String(form.get("password") ?? "");
    const pdf = await officeToPdf(await fileToBuffer(file), file.name, password);
    const base = file.name.replace(/\.[^.]+$/, "");
    return fileResponse(pdf, `${base}.pdf`);
  } catch (err) {
    return errorResponse(err);
  }
}
