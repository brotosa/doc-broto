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
| PDF → Word/Excel/PowerPoint/CSV | Python (`pdf2docx`, `python-pptx`, `openpyxl`, PyMuPDF) — alta fidelidade; aceita senha de abertura via `qpdf --decrypt` |
| PDF → Markdown / JSON | `pdftotext` + `pdfinfo` — texto por página (determinístico, sem IA) |
| Combinar arquivos mistos → PDF / Word | LibreOffice + `pdfunite` (+ conversão de volta p/ Word) |
| Comprimir (texto preservado) | Ghostscript |
| Proteger / Desbloquear (senha) | qpdf |
| OCR (PDF pesquisável) | ocrmypdf / Tesseract (por+eng) |
| PDF → PDF/A | Ghostscript |
| Reparar PDF | qpdf / Ghostscript |
| HTML → PDF | Chromium (Playwright) |
| Resumir · Traduzir | API da Anthropic (`claude-opus-5`) + `pdftotext` |

As ferramentas de IA exigem `ANTHROPIC_API_KEY`; sem ela, retornam um aviso claro e as
demais continuam funcionando.

### Recursos gerais

- **Conversão em lote:** vários arquivos numa conversão → download único `.zip`
  (empacotado no navegador, sem servidor — `src/lib/zip.ts`).
- **Aviso de PDF escaneado:** conversões detectam PDF sem texto (`pdftotext`) e
  devolvem o header `X-Broto-Aviso` sugerindo OCR antes.
- **Meu histórico** (`/meus-arquivos`): registro por usuário do uso das ferramentas
  (sem guardar arquivos).
- **Modo escuro** (classe `dark` + preferência salva) e **atalhos de teclado** (`?`).
- **PWA instalável:** `app/manifest.ts`, ícones em `public/` e `public/sw.js`
  (cache só de assets estáticos; HTML e `/api` sempre pela rede).
- **Limites configuráveis** pelo admin (aba *Limites*): tamanho de upload, timeout de
  conversão e tamanho do lote — `src/lib/server/limits.ts`.
- **Métricas de uso** no admin (aba *Métricas*): agregação do log de atividade.

### PDFs protegidos por senha

Há dois tipos de proteção. **Restrições de dono** (o PDF abre normal, mas bloqueia
imprimir/copiar) são removidas **sem senha** — as conversões funcionam direto. **Senha de
abertura** criptografa o conteúdo: as conversões PDF→Office/CSV e o Desbloquear PDF aceitam
a senha (campo opcional) e rodam `qpdf --decrypt` antes de processar. **Sem a senha correta
não há como recuperar** um PDF com senha de abertura — é a criptografia funcionando; as
mensagens de erro orientam o usuário a solicitar o arquivo original.

**Office (Word/Excel/PowerPoint → PDF):** arquivos OOXML com **senha de abertura** são
criptografados (viram *OLE compound file*, magic `D0CF11E0`) — detectamos isso e, se o
usuário informar a senha, descriptografamos com `msoffcrypto-tool` antes do LibreOffice.
Arquivos que **abrem normalmente** mas têm só **restrições internas** (imprimir/editar/
preencher) convertem sem senha — o LibreOffice lê o arquivo (ZIP normal) e gera o PDF direto.

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
