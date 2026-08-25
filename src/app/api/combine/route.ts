import { fileToBuffer, fileResponse, errorResponse, MAX_UPLOAD_BYTES } from "@/lib/server/http";
import { combineToPdf, combineToWord, COMBINE_ACCEPT_RE, type InputFile } from "@/lib/server/combine";
import { ProcessingError } from "@/lib/server/exec";

export const runtime = "nodejs";
export const maxDuration = 300;

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(request: Request) {
  try {
    const target = new URL(request.url).searchParams.get("target") === "docx" ? "docx" : "pdf";
    const form = await request.formData();
    const raw = form.getAll("files").filter((f): f is File => f instanceof File);
    if (raw.length < 2) throw new ProcessingError("Envie ao menos dois arquivos para combinar.");
    let total = 0;
    const files: InputFile[] = [];
    for (const f of raw) {
      if (!COMBINE_ACCEPT_RE.test(f.name)) {
        throw new ProcessingError(`Formato não suportado: ${f.name}. Use PDF, Word, Excel, PowerPoint ou texto.`);
      }
      total += f.size;
      if (total > MAX_UPLOAD_BYTES) throw new ProcessingError("Os arquivos somam mais de 100 MB.");
      files.push({ name: f.name, buf: await fileToBuffer(f) });
    }
    if (target === "docx") {
      const out = await combineToWord(files);
      return fileResponse(out, "combinado.docx", DOCX);
    }
    const out = await combineToPdf(files);
    return fileResponse(out, "combinado.pdf");
  } catch (err) {
    return errorResponse(err);
  }
}
