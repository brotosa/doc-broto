// PDF -> Excel (.xlsx) sem LibreOffice.
//
// O LibreOffice importa PDF sempre como documento do Writer/Draw e não tem
// caminho para o Calc, então "--convert-to xlsx" aborta (código 134/SIGABRT).
// Aqui fazemos a extração por conta própria: pegamos o texto COM COORDENADAS
// via `pdftotext -bbox` (poppler), reconstruímos linhas e colunas por posição
// e montamos o .xlsx manualmente (OOXML dentro de um zip com jszip).
// Nenhuma dependência nova; o poppler-utils já faz parte da imagem.

import { join } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import JSZip from "jszip";
import { run, withWorkspace, ProcessingError } from "./exec";

type Item = { x: number; y: number; w: number; str: string };
type Cell = { x: number; text: string };

// Tolerâncias (em pontos do PDF). Ajustadas para tabelas comuns.
const ROW_TOL = 4; // itens dentro dessa distância vertical = mesma linha
const CELL_GAP = 12; // espaço horizontal que separa uma célula da próxima
const COL_TOL = 18; // aproxima inícios de célula para formar colunas
const MAX_ROWS = 20000;
const MAX_COLS = 256;

/**
 * Extrai as linhas (matriz de texto) de cada página do PDF.
 *
 * Usa `pdftotext -bbox` (poppler), que devolve um XML com a posição
 * (xMin/yMin/xMax/yMax) de cada palavra. É robusto no servidor empacotado e
 * não depende do worker do pdf.js (que não resolve dentro do bundle do Next).
 */
export async function extractPages(input: Buffer): Promise<string[][][]> {
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.xml");
    await writeFile(inPath, input);
    await run("pdftotext", ["-bbox", "-q", inPath, outPath], { timeoutMs: 120_000 });
    const xml = await readFile(outPath, "utf8");
    return parseBboxXml(xml);
  });
}

/** Interpreta o XML do `pdftotext -bbox` em uma matriz por página. */
function parseBboxXml(xml: string): string[][][] {
  const pages: string[][][] = [];
  const pageRe = /<page\b[^>]*>([\s\S]*?)<\/page>/g;
  const wordRe = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g;
  let pm: RegExpExecArray | null;
  let rowCount = 0;
  while ((pm = pageRe.exec(xml))) {
    const items: Item[] = [];
    let wm: RegExpExecArray | null;
    wordRe.lastIndex = 0;
    while ((wm = wordRe.exec(pm[1]))) {
      const xMin = parseFloat(wm[1]);
      const yMin = parseFloat(wm[2]);
      const xMax = parseFloat(wm[3]);
      const str = decodeXml(wm[5]).trim();
      if (!str) continue;
      items.push({ x: xMin, y: yMin, w: Math.max(0, xMax - xMin), str });
    }
    if (!items.length) continue;
    const grid = itemsToGrid(items);
    pages.push(grid);
    rowCount += grid.length;
    if (rowCount > MAX_ROWS) break;
  }
  return pages;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Agrupa itens em linhas (por y) e colunas (por x) → matriz de strings. */
function itemsToGrid(items: Item[]): string[][] {
  // 1) Linhas: ordena por y e agrupa por proximidade vertical.
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Item[][] = [];
  let cur: Item[] = [];
  let curY = items[0].y; // âncora = y do primeiro item da linha
  for (const it of items) {
    if (cur.length && Math.abs(it.y - curY) > ROW_TOL) {
      rows.push(cur);
      cur = [];
    }
    if (cur.length === 0) curY = it.y;
    cur.push(it);
  }
  if (cur.length) rows.push(cur);

  // 2) Em cada linha, une itens próximos em células.
  const rowCells: Cell[][] = rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    const cells: Cell[] = [];
    let text = "";
    let startX = row[0].x;
    let prevEnd = row[0].x;
    for (const it of row) {
      const gap = it.x - prevEnd;
      if (text && gap > CELL_GAP) {
        cells.push({ x: startX, text: text.trim() });
        text = "";
        startX = it.x;
      }
      text += (text ? " " : "") + it.str;
      prevEnd = it.x + it.w;
    }
    if (text.trim()) cells.push({ x: startX, text: text.trim() });
    return cells;
  });

  // 3) Descobre as colunas: agrupa os x de início de célula da página toda.
  const starts = rowCells.flatMap((r) => r.map((c) => c.x)).sort((a, b) => a - b);
  const colCenters: number[] = [];
  for (const x of starts) {
    const last = colCenters[colCenters.length - 1];
    if (last === undefined || x - last > COL_TOL) colCenters.push(x);
    else colCenters[colCenters.length - 1] = (last + x) / 2;
  }
  const columns = colCenters.slice(0, MAX_COLS);

  const nearestCol = (x: number) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < columns.length; i++) {
      const d = Math.abs(columns[i] - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  };

  // 4) Monta a matriz.
  const grid: string[][] = [];
  for (const cells of rowCells) {
    const line = new Array(columns.length).fill("");
    for (const c of cells) {
      const idx = nearestCol(c.x);
      line[idx] = line[idx] ? `${line[idx]} ${c.text}` : c.text;
    }
    grid.push(line);
  }
  return grid;
}

// ---- Escrita do .xlsx (OOXML) --------------------------------------------

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colName(n: number): string {
  let s = "";
  n += 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Detecta números (inclusive formato BR "1.234,56") de forma conservadora,
// sem estragar códigos com zero à esquerda.
function asNumber(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^0\d/.test(t.replace(/[^\d]/g, "")) && !/[,.]/.test(t)) return null;
  let norm = t;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) norm = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+(,\d+)$/.test(t)) norm = t.replace(",", ".");
  else if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

function sheetXml(grid: string[][]): string {
  const rows = grid
    .map((row, r) => {
      const cells = row
        .map((val, c) => {
          if (val === "" || val == null) return "";
          const ref = `${colName(c)}${r + 1}`;
          const num = asNumber(val);
          if (num !== null) return `<c r="${ref}"><v>${num}</v></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(val)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
}

function buildWorkbook(pages: string[][][]): { workbook: string; rels: string; contentTypes: string; sheetNames: string[] } {
  const sheetNames = pages.map((_, i) => `Página ${i + 1}`);
  const sheets = sheetNames
    .map((name, i) => `<sheet name="${xmlEscape(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("");
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets}</sheets></workbook>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${pages
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join("")}</Relationships>`;

  const overrides = pages
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`;

  return { workbook, rels, contentTypes, sheetNames };
}

/** Converte um PDF em uma planilha .xlsx reconstruída a partir do texto. */
export async function pdfToXlsx(input: Buffer): Promise<Buffer> {
  let pages = await extractPages(input);
  // Garante ao menos uma aba, mesmo que o PDF não tenha texto extraível.
  if (!pages.length) pages = [[["(Sem texto extraível neste PDF.)"]]];

  const { workbook, rels, contentTypes } = buildWorkbook(pages);
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", workbook);
  zip.file("xl/_rels/workbook.xml.rels", rels);
  pages.forEach((grid, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(grid)));

  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  if (!out?.length) throw new ProcessingError("Falha ao gerar a planilha.");
  return out;
}

// Escapa um valor para CSV (RFC 4180): aspas se tiver vírgula, aspas ou quebra.
function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Converte um PDF em CSV, reconstruindo a tabela a partir do texto. */
export async function pdfToCsv(input: Buffer): Promise<Buffer> {
  const pages = await extractPages(input);
  const chunks: string[] = [];
  pages.forEach((grid, i) => {
    if (i > 0) chunks.push(""); // linha em branco separando páginas
    if (pages.length > 1) chunks.push(`# Página ${i + 1}`);
    for (const row of grid) chunks.push(row.map(csvCell).join(","));
  });
  // BOM para o Excel abrir acentos corretamente.
  return Buffer.from("﻿" + chunks.join("\r\n"), "utf8");
}
