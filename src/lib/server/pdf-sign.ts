import { join } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { run, withWorkspace, ProcessingError } from "./exec";

// Assinatura digital com certificado ICP-Brasil A1 (.pfx/.p12), padrão PAdES
// (AD-RB básica) via pyHanko. A chave privada é usada apenas em memória/arquivo
// temporário e descartada com o workspace — nunca é persistida.
const PYTHON = process.env.PYTHON_BIN || "python3";

const SCRIPT = `import sys, json, os, time
os.environ["TZ"] = "America/Sao_Paulo"
try:
    time.tzset()
except Exception:
    pass
from pyhanko.sign import signers, fields
from pyhanko.sign.timestamps import HTTPTimeStamper
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko import stamp
from pyhanko.pdf_utils import text

cfg = json.loads(sys.argv[1])
try:
    signer = signers.SimpleSigner.load_pkcs12(pfx_file=cfg["pfx"], passphrase=cfg["password"].encode("utf-8"))
except Exception:
    raise SystemExit("CERT_INVALIDO")
if signer is None:
    raise SystemExit("CERT_INVALIDO")

# Carimbo de tempo RFC3161 opcional (PAdES-B-T): comprova a hora da
# assinatura criptograficamente. Basta uma URL de TSA (padrão gratuito;
# troque por uma ACT ICP-Brasil credenciada para AD-RT oficial).
timestamper = HTTPTimeStamper(cfg["tsa_url"]) if cfg.get("tsa_url") else None

meta = signers.PdfSignatureMetadata(field_name=cfg.get("field", "Assinatura1"), subfilter=fields.SigSeedSubFilter.PADES, reason=(cfg.get("reason") or None), location=(cfg.get("location") or None))

def page_box(reader, page_idx, corner):
    pg = reader.root["/Pages"]["/Kids"][page_idx].get_object()
    mb = [float(x) for x in pg["/MediaBox"]]
    x0, y0, x1, y1 = mb
    w, h, m = 220, 74, 36
    if corner == "bl": bx, by = x0 + m, y0 + m
    elif corner == "tl": bx, by = x0 + m, y1 - m - h
    elif corner == "tr": bx, by = x1 - m - w, y1 - m - h
    else: bx, by = x1 - m - w, y0 + m
    return (bx, by, bx + w, by + h)

with open(cfg["inpdf"], "rb") as inf, open(cfg["outpdf"], "wb") as outf:
    if cfg.get("visible"):
        r = PdfFileReader(inf)
        npages = r.root["/Pages"]["/Count"]
        page = int(cfg.get("page", 0))
        if page < 0 or page >= npages: page = npages - 1
        box = page_box(r, page, cfg.get("corner", "br"))
        inf.seek(0)
        w = IncrementalPdfFileWriter(inf)
        line = "Assinado digitalmente por\\n%(signer)s\\nData: %(ts)s"
        if cfg.get("reason"): line += "\\nMotivo: " + cfg["reason"]
        stamp_style = stamp.TextStampStyle(stamp_text=line, border_width=0, text_box_style=text.TextBoxStyle(font_size=8), timestamp_format="%d/%m/%Y %H:%M:%S %Z")
        pdf_signer = signers.PdfSigner(meta, signer=signer, stamp_style=stamp_style, timestamper=timestamper, new_field_spec=fields.SigFieldSpec(sig_field_name=meta.field_name, on_page=page, box=box))
    else:
        w = IncrementalPdfFileWriter(inf)
        pdf_signer = signers.PdfSigner(meta, signer=signer, timestamper=timestamper)
    try:
        pdf_signer.sign_pdf(w, output=outf, existing_fields_only=False)
    except SystemExit:
        raise
    except Exception as e:
        if timestamper is not None:
            raise SystemExit("TSA_FALHOU")
        raise
print("OK")
`;

// TSA público gratuito (RFC3161). Para AD-RT oficial ICP-Brasil, troque
// por uma ACT credenciada via a env TSA_URL.
const DEFAULT_TSA_URL = "http://timestamp.digicert.com";

export type SignOptions = {
  password: string;
  reason?: string;
  location?: string;
  visible?: boolean;
  page?: number; // 0-based
  corner?: "br" | "bl" | "tr" | "tl";
  timestamp?: boolean; // incluir carimbo de tempo RFC3161 (PAdES-B-T)
};

export async function signPdfWithCert(pdf: Buffer, pfx: Buffer, opts: SignOptions): Promise<Buffer> {
  return withWorkspace(async (dir) => {
    const inPath = join(dir, "in.pdf");
    const outPath = join(dir, "out.pdf");
    const pfxPath = join(dir, "cert.pfx");
    const scriptPath = join(dir, "sign.py");
    await writeFile(inPath, pdf);
    await writeFile(pfxPath, pfx);
    await writeFile(scriptPath, SCRIPT);
    const cfg = {
      inpdf: inPath,
      outpdf: outPath,
      pfx: pfxPath,
      password: opts.password ?? "",
      reason: opts.reason || "",
      location: opts.location || "",
      visible: opts.visible !== false,
      page: opts.page ?? 0,
      corner: opts.corner || "br",
      tsa_url: opts.timestamp ? (process.env.TSA_URL || DEFAULT_TSA_URL) : "",
    };
    try {
      await run(PYTHON, [scriptPath, JSON.stringify(cfg)], {
        timeoutMs: 120_000,
        env: { TZ: "America/Sao_Paulo" } as NodeJS.ProcessEnv,
      });
    } catch (e) {
      const err = e as ProcessingError;
      const blob = `${err.message || ""} ${err.detail || ""}`;
      if (blob.includes("CERT_INVALIDO")) {
        throw new ProcessingError("Certificado inválido ou senha incorreta. Verifique o arquivo .pfx/.p12 e a senha.");
      }
      if (blob.includes("TSA_FALHOU")) {
        throw new ProcessingError("Não foi possível obter o carimbo de tempo (o servidor de carimbo pode estar indisponível). Tente novamente ou desmarque a opção de carimbo de tempo para assinar sem ele.");
      }
      throw new ProcessingError(
        "Não foi possível assinar este PDF. Ele pode estar protegido, corrompido ou o certificado é incompatível.",
        blob
      );
    }
    return readFile(outPath);
  });
}
