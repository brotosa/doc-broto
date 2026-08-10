import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { run, withWorkspace, ProcessingError } from "./exec";

/** Default model. Overridable via env for cost/tier control. */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  if (!aiEnabled()) {
    throw new ProcessingError(
      "Recurso de IA indisponível: defina a variável de ambiente ANTHROPIC_API_KEY."
    );
  }
  return new Anthropic();
}

/** Extract plain text from a PDF via poppler's pdftotext. */
export async function extractPdfText(input: Buffer): Promise<string> {
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.txt");
    await writeFile(inPath, input);
    await run("pdftotext", ["-layout", "-enc", "UTF-8", inPath, outPath]);
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(outPath, "utf8");
    if (!text.trim()) {
      throw new ProcessingError(
        "Não foi possível extrair texto do PDF. Ele pode ser um documento escaneado — use a ferramenta OCR primeiro."
      );
    }
    return text;
  });
}

/** Guard against runaway token usage on very large documents. */
function clampText(text: string, maxChars = 600_000): string {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

/** Run a single-shot completion, streamed server-side to avoid HTTP timeouts. */
async function complete(system: string, userText: string): Promise<string> {
  const anthropic = client();
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 32_000,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: userText }],
  });
  const message = await stream.finalMessage();
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function summarizePdf(input: Buffer): Promise<string> {
  const text = clampText(await extractPdfText(input));
  return complete(
    "Você é um assistente que resume documentos em português do Brasil. " +
      "Produza um resumo conciso e fiel: um parágrafo de visão geral seguido de uma lista de pontos-chave. " +
      "Não invente informações que não estejam no texto.",
    `Resuma o seguinte documento:\n\n${text}`
  );
}

export async function translatePdf(input: Buffer, target: string): Promise<string> {
  const text = clampText(await extractPdfText(input));
  return complete(
    `Você é um tradutor profissional. Traduza fielmente para ${target}, ` +
      "preservando a estrutura, os parágrafos e a terminologia. " +
      "Responda apenas com a tradução, sem comentários.",
    text
  );
}

export async function pdfToMarkdown(input: Buffer): Promise<string> {
  const text = clampText(await extractPdfText(input));
  return complete(
    "Você converte texto extraído de PDFs em Markdown limpo e bem estruturado. " +
      "Identifique títulos, listas, tabelas e ênfases, e reconstrua-os em Markdown. " +
      "Preserve todo o conteúdo; responda apenas com o Markdown.",
    `Converta o seguinte conteúdo em Markdown:\n\n${text}`
  );
}
