import { chromium, type Browser } from "playwright-core";
import { ProcessingError } from "./exec";

/**
 * Resolve the Chromium executable. In the Docker image / this environment the
 * browser lives under a fixed path; override with CHROMIUM_PATH if needed.
 */
function executablePath(): string | undefined {
  return process.env.CHROMIUM_PATH || undefined;
}

async function launch(): Promise<Browser> {
  return chromium.launch({
    executablePath: executablePath(),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

/** Render a URL or raw HTML to a PDF buffer. */
export async function htmlToPdf(opts: { url?: string; html?: string }): Promise<Buffer> {
  if (!opts.url && !opts.html) {
    throw new ProcessingError("Informe uma URL ou conteúdo HTML.");
  }
  let browser: Browser | null = null;
  try {
    browser = await launch();
    const page = await browser.newPage();
    if (opts.url) {
      const url = /^https?:\/\//i.test(opts.url) ? opts.url : `https://${opts.url}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    } else {
      await page.setContent(opts.html!, { waitUntil: "networkidle", timeout: 60_000 });
    }
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdf);
  } catch (e) {
    throw new ProcessingError(
      "Não foi possível gerar o PDF a partir do HTML/URL.",
      (e as Error).message
    );
  } finally {
    await browser?.close().catch(() => {});
  }
}
