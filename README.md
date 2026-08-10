# Broto — Ferramentas de PDF

Suíte de ferramentas de PDF no estilo iLovePDF, com a **identidade visual do Broto**
(ver `brand/BRAND.md`). Construída com **Next.js 16 (App Router)**, **TypeScript** e
**Tailwind CSS**, numa única aplicação conteinerizada que reúne frontend e backend de
processamento de documentos.

- **Client-side** (no navegador, via `pdf-lib` + `pdf.js`): operações rápidas e privadas.
- **Server-side** (API routes que executam binários): conversões Office, OCR, proteção,
  compressão de alta qualidade, HTML→PDF e IA.

## Ferramentas

### No navegador (sem servidor)
Juntar · Dividir · Comprimir (rasterização) · Rodar · Organizar (miniaturas) ·
Números de página · Marca d'água · JPG→PDF · PDF→JPG · Recortar · Assinar (desenho) ·
Ocultar/redação (rasteriza a página, destruindo o conteúdo sob a tarja).

### No servidor (`src/lib/server/` + `src/app/api/`)
| Ferramenta | Motor |
| --- | --- |
| Word/PowerPoint/Excel → PDF | LibreOffice (`soffice`) |
| PDF → Word/Excel/PowerPoint | LibreOffice (`writer_pdf_import`) — fidelidade best-effort |
| Comprimir (texto preservado) | Ghostscript |
| Proteger / Desbloquear (senha) | qpdf |
| OCR (PDF pesquisável) | ocrmypdf / Tesseract (por+eng) |
| PDF → PDF/A | Ghostscript |
| Reparar PDF | qpdf / Ghostscript |
| HTML → PDF | Chromium (Playwright) |
| Resumir · Traduzir · PDF → Markdown | API da Anthropic (`claude-opus-5`) + `pdftotext` |

As ferramentas de IA exigem `ANTHROPIC_API_KEY`; sem ela, retornam um aviso claro e as
demais continuam funcionando.

## Rodar localmente

```bash
npm install
npm run dev            # http://localhost:3000
```

As ferramentas de servidor exigem os binários: `libreoffice`, `qpdf`, `ghostscript`,
`poppler-utils`, `tesseract`/`ocrmypdf` e `chromium`. A forma mais simples é usar Docker:

```bash
docker compose up --build       # instala tudo na imagem
```

## Arquitetura

```
src/
  app/                 # páginas (uma por ferramenta) + api/ (rotas de backend)
  components/          # UI (grade, cards, dropzone, BackendTool, Logo Broto)
  lib/                 # utilitários client-side + registro de ferramentas (tools.ts)
  lib/server/          # execução de binários (exec, pdf-ops, browser, ai) — isolável em worker
brand/                 # guia de marca + tokens aplicados (BRAND.md)
infra/                 # AWS CDK (VPC + ECS Fargate + ALB)
Dockerfile             # imagem única (Next.js + binários)
.github/workflows/     # CI (PRs) e Deploy de produção (main)
```

Adicionar uma ferramenta nova: marque `ready: true` em `src/lib/tools.ts` e crie
`src/app/<slug>/page.tsx` (client-side) ou uma rota em `src/app/api/` + página com
`<BackendTool>`.

## Deploy na AWS

Produção = branch **`main`**. Ver `infra/README.md` para o passo a passo (CDK) e o
workflow `.github/workflows/deploy.yml` (deploy automático a cada push em `main`).
Resumo: `cd infra && npm install && npx cdk bootstrap && npm run deploy`.

## Marca

Cores, tipografia (Gordita/Verdana) e logo seguem `brand/BRAND.md`, derivado do
`brand/GuiaDeMarca-Broto-2022.pdf`.
