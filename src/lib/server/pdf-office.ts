import { join } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { run, withWorkspace, ProcessingError } from "./exec";

// Conversões PDF -> Office com motores dedicados (muito melhores que o
// writer_pdf_import do LibreOffice, que perdia imagens/páginas):
//   docx  -> pdf2docx (texto, imagens e tabelas, todas as páginas)
//   pptx  -> PyMuPDF renderiza cada página como slide (fiel, com imagens)
//   xlsx  -> PyMuPDF detecta tabelas; sem tabela, cai para texto por linha
// Requer python3 com pdf2docx, python-pptx e openpyxl (ver Dockerfile).
const PYTHON = process.env.PYTHON_BIN || "python3";

const SCRIPT = `import sys
mode, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
if mode == "docx":
    from pdf2docx import Converter
    c = Converter(src); c.convert(dst); c.close()
elif mode == "pptx":
    import pymupdf
    from pptx import Presentation
    from pptx.util import Emu
    doc = pymupdf.open(src)
    if doc.page_count == 0:
        raise SystemExit("PDF vazio")
    prs = Presentation()
    r0 = doc[0].rect
    EMU = 914400
    prs.slide_width = Emu(int(r0.width / 72 * EMU))
    prs.slide_height = Emu(int(r0.height / 72 * EMU))
    blank = prs.slide_layouts[6]
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=150)
        img = f"{dst}.{i}.png"; pix.save(img)
        s = prs.slides.add_slide(blank)
        s.shapes.add_picture(img, 0, 0, width=prs.slide_width, height=prs.slide_height)
    prs.save(dst)
elif mode == "xlsx":
    import pymupdf, openpyxl
    doc = pymupdf.open(src)
    wb = openpyxl.Workbook(); wb.remove(wb.active)
    for i, page in enumerate(doc):
        ws = wb.create_sheet((f"Pagina {i+1}")[:31])
        row = 1
        tabs = page.find_tables()
        if tabs.tables:
            for t in tabs.tables:
                for r in t.extract():
                    for c, val in enumerate(r, 1):
                        ws.cell(row=row, column=c, value=(str(val).strip() if val is not None else ""))
                    row += 1
                row += 1
        else:
            for line in page.get_text().splitlines():
                if line.strip():
                    ws.cell(row=row, column=1, value=line); row += 1
    if not wb.sheetnames:
        wb.create_sheet("Pagina 1")
    wb.save(dst)
else:
    raise SystemExit("modo invalido")
`;

export async function pdfToOfficePy(input: Buffer, target: "docx" | "pptx" | "xlsx"): Promise<Buffer> {
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, `out.${target}`);
    const scriptPath = join(dir, "conv.py");
    await writeFile(inPath, input);
    await writeFile(scriptPath, SCRIPT);
    try {
      await run(PYTHON, [scriptPath, target, inPath, outPath], { timeoutMs: 300_000 });
      return await readFile(outPath);
    } catch (e) {
      // Sempre devolve um ProcessingError (mensagem clara, 400) em vez de
      // deixar escapar uma exceção crua (que viraria "Erro inesperado", 500).
      throw new ProcessingError(
        "Não foi possível converter este PDF. Ele pode estar protegido por senha, corrompido ou em um formato não suportado.",
        (e as Error).message
      );
    }
  });
}
