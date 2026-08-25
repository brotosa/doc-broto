import { join } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { run, withWorkspace, ProcessingError } from "./exec";
import { officeToPdf } from "./pdf-ops";
import { pdfToOfficePy } from "./pdf-office";

export type InputFile = { name: string; buf: Buffer };

const PDF_RE = /\.pdf$/i;
const OFFICE_RE = /\.(docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|csv)$/i;
export const COMBINE_ACCEPT_RE = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|csv)$/i;

/**
 * Combina vários arquivos (PDF + Office, em qualquer ordem) num único PDF:
 * cada arquivo não-PDF é convertido para PDF via LibreOffice e todos são
 * unidos com `pdfunite` (poppler), preservando a ordem recebida.
 */
export async function combineToPdf(files: InputFile[]): Promise<Buffer> {
  if (!files.length) throw new ProcessingError("Envie ao menos um arquivo.");
  return withWorkspace(async (dir) => {
    const parts: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const part = join(dir, `part_${String(i).padStart(3, "0")}.pdf`);
      if (PDF_RE.test(f.name)) {
        await writeFile(part, f.buf);
      } else if (OFFICE_RE.test(f.name)) {
        await writeFile(part, await officeToPdf(f.buf, f.name));
      } else {
        throw new ProcessingError(`Formato não suportado: ${f.name}`);
      }
      parts.push(part);
    }
    if (parts.length === 1) return readFile(parts[0]);
    const out = join(dir, "combinado.pdf");
    await run("pdfunite", [...parts, out], { timeoutMs: 240_000 });
    return readFile(out);
  });
}

/**
 * Combina vários arquivos num único Word (.docx): primeiro gera o PDF
 * combinado e depois converte para Word (mesmo motor do PDF→Word).
 */
export async function combineToWord(files: InputFile[]): Promise<Buffer> {
  const pdf = await combineToPdf(files);
  return pdfToOfficePy(pdf, "docx");
}
