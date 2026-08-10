import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, parse } from "node:path";
import { run, withWorkspace, ProcessingError } from "./exec";

/** Locate the LibreOffice binary. */
const SOFFICE = process.env.SOFFICE_BIN || "soffice";

/**
 * Convert an office document (docx/xlsx/pptx/odt/...) to PDF via LibreOffice.
 * A per-call user profile lets multiple conversions run concurrently.
 */
export async function officeToPdf(input: Buffer, filename: string): Promise<Buffer> {
  return withWorkspace(async (dir) => {
    const base = parse(filename).name || "documento";
    const inPath = join(dir, `${base}${parse(filename).ext || ".docx"}`);
    await writeFile(inPath, input);
    await run(
      SOFFICE,
      [
        "--headless",
        "--norestore",
        "--nolockcheck",
        `-env:UserInstallation=file://${join(dir, "lo-profile")}`,
        "--convert-to",
        "pdf",
        "--outdir",
        dir,
        inPath,
      ],
      { timeoutMs: 180_000 }
    );
    return readSingleOutput(dir, ".pdf");
  });
}

const PDF_IMPORT_FILTERS: Record<string, { ext: string; filter: string }> = {
  docx: { ext: "docx", filter: "MS Word 2007 XML" },
  xlsx: { ext: "xlsx", filter: "Calc MS Excel 2007 XML" },
  pptx: { ext: "pptx", filter: "Impress MS PowerPoint 2007 XML" },
};

/**
 * Convert a PDF to an editable office format via LibreOffice's PDF import.
 * Layout fidelity is best-effort (LibreOffice reconstructs the PDF).
 */
export async function pdfToOffice(input: Buffer, target: "docx" | "xlsx" | "pptx"): Promise<Buffer> {
  const spec = PDF_IMPORT_FILTERS[target];
  if (!spec) throw new ProcessingError("Formato de destino inválido.");
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "entrada.pdf");
    await writeFile(inPath, input);
    await run(
      SOFFICE,
      [
        "--headless",
        "--norestore",
        "--nolockcheck",
        `-env:UserInstallation=file://${join(dir, "lo-profile")}`,
        "--infilter=writer_pdf_import",
        "--convert-to",
        `${spec.ext}:${spec.filter}`,
        "--outdir",
        dir,
        inPath,
      ],
      { timeoutMs: 180_000 }
    );
    return readSingleOutput(dir, `.${spec.ext}`);
  });
}

const GS_PRESETS: Record<string, string> = {
  less: "/prepress", // higher quality, less compression
  recommended: "/ebook",
  extreme: "/screen", // lowest quality, most compression
};

/** Compress a PDF with Ghostscript (real downsampling, keeps text selectable). */
export async function compressPdf(input: Buffer, level: keyof typeof GS_PRESETS): Promise<Buffer> {
  const preset = GS_PRESETS[level] ?? GS_PRESETS.recommended;
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.pdf");
    await writeFile(inPath, input);
    await run("gs", [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.5",
      `-dPDFSETTINGS=${preset}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dDetectDuplicateImages=true",
      `-sOutputFile=${outPath}`,
      inPath,
    ]);
    return readFile(outPath);
  });
}

/** Add owner/user password + encryption to a PDF via qpdf. */
export async function protectPdf(input: Buffer, password: string): Promise<Buffer> {
  if (!password) throw new ProcessingError("Senha obrigatória.");
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.pdf");
    await writeFile(inPath, input);
    await run("qpdf", [
      "--encrypt",
      password,
      password,
      "256",
      "--",
      inPath,
      outPath,
    ]);
    return readFile(outPath);
  });
}

/** Remove password/encryption from a PDF via qpdf. */
export async function unlockPdf(input: Buffer, password: string): Promise<Buffer> {
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.pdf");
    await writeFile(inPath, input);
    try {
      await run("qpdf", [
        `--password=${password ?? ""}`,
        "--decrypt",
        inPath,
        outPath,
      ]);
    } catch (e) {
      throw new ProcessingError(
        "Não foi possível desbloquear. A senha pode estar incorreta.",
        (e as Error).message
      );
    }
    return readFile(outPath);
  });
}

/** Make a scanned PDF searchable via OCR (ocrmypdf/tesseract). */
export async function ocrPdf(input: Buffer, lang = "por+eng"): Promise<Buffer> {
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.pdf");
    await writeFile(inPath, input);
    await run(
      "ocrmypdf",
      ["-l", lang, "--skip-text", "--optimize", "1", inPath, outPath],
      { timeoutMs: 300_000 }
    );
    return readFile(outPath);
  });
}

/** Convert to PDF/A-2b for long-term archiving via Ghostscript. */
export async function pdfToPdfA(input: Buffer): Promise<Buffer> {
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.pdf");
    await writeFile(inPath, input);
    await run("gs", [
      "-dPDFA=2",
      "-dBATCH",
      "-dNOPAUSE",
      "-dQUIET",
      "-sColorConversionStrategy=UseDeviceIndependentColor",
      "-sDEVICE=pdfwrite",
      "-dPDFACompatibilityPolicy=1",
      `-sOutputFile=${outPath}`,
      inPath,
    ]);
    return readFile(outPath);
  });
}

/** Repair a damaged/corrupt PDF by rewriting its structure via qpdf. */
export async function repairPdf(input: Buffer): Promise<Buffer> {
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.pdf");
    await writeFile(inPath, input);
    try {
      await run("qpdf", ["--replace-input", "--", inPath], {}).catch(() => null);
      // qpdf linearize/rewrite; fall back to ghostscript if qpdf can't parse.
      await run("qpdf", ["--decrypt", "--object-streams=generate", inPath, outPath]);
    } catch {
      await run("gs", [
        "-o",
        outPath,
        "-sDEVICE=pdfwrite",
        "-dPDFSETTINGS=/default",
        "-dBATCH",
        "-dNOPAUSE",
        "-dQUIET",
        inPath,
      ]);
    }
    return readFile(outPath);
  });
}

async function readSingleOutput(dir: string, ext: string): Promise<Buffer> {
  const files = await readdir(dir);
  const match = files.find((f) => f.toLowerCase().endsWith(ext.toLowerCase()));
  if (!match) {
    throw new ProcessingError("A conversão não gerou um arquivo de saída.");
  }
  return readFile(join(dir, match));
}
