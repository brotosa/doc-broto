import { join } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { run, withWorkspace, ProcessingError } from "./exec";

// Conversões PDF -> Office com motores dedicados (muito melhores que o
// writer_pdf_import do LibreOffice, que perdia imagens/páginas):
//   docx  -> pdf2docx (texto, imagens e tabelas, todas as páginas)
//   pptx  -> reconstrução fiel e editável (formas + imagens + texto)
//   xlsx  -> tabelas com borda + grade posicional; números viram números
// Requer python3 com pdf2docx, python-pptx e openpyxl (ver Dockerfile).
const PYTHON = process.env.PYTHON_BIN || "python3";

const SCRIPT = `import sys
mode, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
if mode == "docx":
    from pdf2docx import Converter
    c = Converter(src); c.convert(dst); c.close()
elif mode == "pptx":
    # Reconstrução fiel e EDITÁVEL: fundos/barras viram formas, fotos e
    # logos viram imagens (grupos vetoriais são rasterizados), e o texto
    # vira caixas de texto editáveis com fonte/cor/posição.
    import os, pymupdf
    from pptx import Presentation
    from pptx.util import Emu, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import MSO_ANCHOR
    EMU = 914400
    def E(pt): return Emu(int(round(pt / 72 * EMU)))
    def rgb(t): return RGBColor(max(0, min(255, int(t[0] * 255))), max(0, min(255, int(t[1] * 255))), max(0, min(255, int(t[2] * 255))))
    def rgbi(v): return RGBColor((v >> 16) & 255, (v >> 8) & 255, v & 255)
    def uni(a, b): return pymupdf.Rect(min(a.x0, b.x0), min(a.y0, b.y0), max(a.x1, b.x1), max(a.y1, b.y1))
    doc = pymupdf.open(src)
    if doc.page_count == 0:
        raise SystemExit("PDF vazio")
    prs = Presentation()
    r0 = doc[0].rect
    prs.slide_width = E(r0.width); prs.slide_height = E(r0.height)
    blank = prs.slide_layouts[6]
    media = dst + "_m"; os.makedirs(media, exist_ok=True)
    for pi, page in enumerate(doc):
        slide = prs.slides.add_slide(blank)
        W, H = page.rect.width, page.rect.height; area = W * H
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid(); bg.fill.fore_color.rgb = RGBColor(255, 255, 255); bg.line.fill.background(); bg.shadow.inherit = False
        textrects = []
        for _b in page.get_text("dict")["blocks"]:
            if _b.get("type") != 0: continue
            for _l in _b["lines"]:
                for _s in _l["spans"]:
                    if _s["text"].strip(): textrects.append(pymupdf.Rect(_s["bbox"]))
        small = []
        for d in page.get_drawings():
            rc = d.get("rect")
            if rc is None or rc.width <= 0 or rc.height <= 0: continue
            f = d.get("fill")
            big = f and rc.width >= 15 and rc.height >= 15 and (rc.width * rc.height) >= 0.01 * area
            if (big and (rc.width < W * 0.999 or rc.height < H * 0.999)) or (f and (rc.width * rc.height) >= 0.04 * area):
                sp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, E(rc.x0), E(rc.y0), E(rc.width), E(rc.height))
                sp.fill.solid(); sp.fill.fore_color.rgb = rgb(f); sp.line.fill.background(); sp.shadow.inherit = False
            else:
                small.append(rc)
        for img in page.get_images(full=True):
            xref = img[0]
            try: ex = doc.extract_image(xref)
            except Exception: continue
            p = os.path.join(media, f"{pi}_{xref}.{ex['ext']}"); open(p, "wb").write(ex["image"])
            for rc in page.get_image_rects(xref):
                try: slide.shapes.add_picture(p, E(rc.x0), E(rc.y0), E(rc.width), E(rc.height))
                except Exception: pass
        clusters = []
        for rc in small:
            placed = False
            for i2, c in enumerate(clusters):
                if rc.intersects(c + (-6, -6, 6, 6)) or c.intersects(rc):
                    clusters[i2] = uni(c, rc); placed = True; break
            if not placed: clusters.append(pymupdf.Rect(rc))
        merged = True
        while merged:
            merged = False; out = []
            for c in clusters:
                done = False
                for i2, o in enumerate(out):
                    if o.intersects(c): out[i2] = uni(o, c); done = True; merged = True; break
                if not done: out.append(c)
            clusters = out
        for c in clusters:
            c = c & page.rect
            if c.width < 2 or c.height < 2 or (c.width * c.height) >= 0.5 * area: continue
            if any(c.intersects(tr) for tr in textrects): continue
            pix = page.get_pixmap(clip=c, dpi=220, alpha=True)
            p = os.path.join(media, f"{pi}_clip_{int(c.x0)}_{int(c.y0)}.png"); pix.save(p)
            slide.shapes.add_picture(p, E(c.x0), E(c.y0), E(c.width), E(c.height))
        for blk in page.get_text("dict")["blocks"]:
            if blk.get("type") != 0: continue
            for line in blk["lines"]:
                spans = [s for s in line["spans"] if s["text"].strip()]
                if not spans: continue
                x0 = min(s["bbox"][0] for s in spans); y0 = min(s["bbox"][1] for s in spans)
                x1 = max(s["bbox"][2] for s in spans); y1 = max(s["bbox"][3] for s in spans)
                tb = slide.shapes.add_textbox(E(x0), E(y0), E(x1 - x0 + 6), E(y1 - y0 + 3))
                tf = tb.text_frame; tf.word_wrap = False
                for m in ("margin_left", "margin_right", "margin_top", "margin_bottom"): setattr(tf, m, 0)
                tf.vertical_anchor = MSO_ANCHOR.MIDDLE
                para = tf.paragraphs[0]
                prev_x1 = None; prev_sz = None
                for s in spans:
                    t = s["text"]
                    if prev_x1 is not None and (s["bbox"][0] - prev_x1) > 0.15 * prev_sz and not t.startswith(" "):
                        t = " " + t
                    run = para.add_run(); run.text = t
                    fn = run.font; fn.size = Pt(s["size"])
                    if s["flags"] & 16: fn.bold = True
                    if s["flags"] & 2: fn.italic = True
                    try: fn.color.rgb = rgbi(s["color"])
                    except Exception: pass
                    prev_x1 = s["bbox"][2]; prev_sz = s["size"]
    prs.save(dst)
elif mode == "xlsx":
    # Reconstrução fiel: tabelas com bordas viram planilhas; conteúdo
    # posicional (colunas sem borda) é remontado na grade certa pela
    # posição no PDF; números (pt-BR/en, R$, %) viram números reais.
    import re, pymupdf, openpyxl
    from openpyxl.styles import Font, Alignment
    from openpyxl.utils import get_column_letter
    def coerce(v):
        if v is None: return None, None
        s = str(v).strip()
        if not s: return "", None
        raw = s
        neg = s.startswith("(") and s.endswith(")")
        t = s.replace("R$", "").replace("%", "").replace("(", "").replace(")", "").strip().replace(" ", "").replace("\\u00a0", "")
        if re.fullmatch(r"[+-]?[\\d.,]+", t) and re.search(r"\\d", t):
            if "," in t and "." in t:
                t = t.replace(".", "").replace(",", ".") if t.rfind(",") > t.rfind(".") else t.replace(",", "")
            elif "," in t:
                dec = t.split(",")[-1]
                t = t.replace(".", "").replace(",", ".") if len(dec) <= 2 else t.replace(",", "")
            try:
                num = float(t)
                if neg: num = -num
                fmt = "0.00%" if s.endswith("%") else ("R$ #,##0.00" if "R$" in s else None)
                if s.endswith("%"): num = num / 100.0
                return (int(num) if num == int(num) and "." not in t and "%" not in s else num), fmt
            except ValueError:
                return raw, None
        return raw, None
    def wcell(ws, row, col, text, bold=False):
        val, fmt = coerce(text)
        c = ws.cell(row=row, column=col, value=val)
        if bold: c.font = Font(bold=True)
        if isinstance(val, (int, float)):
            c.number_format = fmt or ("#,##0.00" if isinstance(val, float) else "0")
            c.alignment = Alignment(horizontal="right")
        return c
    def spans(page):
        out = []
        for b in page.get_text("dict")["blocks"]:
            if b.get("type") != 0: continue
            for l in b["lines"]:
                for s in l["spans"]:
                    if s["text"].strip(): out.append(s)
        return out
    def grid_from_spans(sp, page_w):
        if not sp: return []
        xs = sorted(s["bbox"][0] for s in sp)
        tol = max(6, page_w * 0.012)
        edges = [xs[0]]
        for x in xs[1:]:
            if x - edges[-1] > tol: edges.append(x)
        def colof(x):
            best = 0
            for i, e in enumerate(edges):
                if x >= e - tol: best = i
            return best
        items = sorted(sp, key=lambda s: ((s["bbox"][1] + s["bbox"][3]) / 2, s["bbox"][0]))
        heights = sorted((s["bbox"][3] - s["bbox"][1]) for s in sp)
        mh = heights[len(heights) // 2] or 10
        rows = []; cur = []; cy = None
        for s in items:
            yc = (s["bbox"][1] + s["bbox"][3]) / 2
            if cy is None or abs(yc - cy) <= mh * 0.7:
                cur.append(s); cy = yc if cy is None else (cy + yc) / 2
            else:
                rows.append(cur); cur = [s]; cy = yc
        if cur: rows.append(cur)
        grid = []
        for r in rows:
            cells = {}; bolds = {}
            for s in sorted(r, key=lambda s: s["bbox"][0]):
                ci = colof(s["bbox"][0])
                cells[ci] = (cells.get(ci, "") + (" " if ci in cells else "") + s["text"]).strip()
                bolds[ci] = bolds.get(ci, False) or bool(s["flags"] & 16)
            grid.append((cells, bolds))
        return grid
    doc = pymupdf.open(src)
    wb = openpyxl.Workbook(); wb.remove(wb.active)
    for i, page in enumerate(doc):
        ws = wb.create_sheet((f"Pagina {i+1}")[:31]); row = 1
        used = []
        for t in page.find_tables().tables:
            used.append(pymupdf.Rect(t.bbox)); hdr = True
            for r in t.extract():
                for c, val in enumerate(r, 1): wcell(ws, row, c, val, bold=hdr)
                row += 1; hdr = False
            row += 1
        rest = [s for s in spans(page) if not any(pymupdf.Rect(s["bbox"]).intersects(u) for u in used)]
        for cells, bolds in grid_from_spans(rest, page.rect.width):
            if not cells: continue
            for ci in range(max(cells) + 1):
                if ci in cells: wcell(ws, row, ci + 1, cells[ci], bold=bolds.get(ci, False))
            row += 1
        widths = {}
        for rr in ws.iter_rows():
            for c in rr:
                if c.value is not None:
                    widths[c.column] = max(widths.get(c.column, 8), min(60, len(str(c.value)) + 2))
        for col, w in widths.items():
            ws.column_dimensions[get_column_letter(col)].width = w
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
