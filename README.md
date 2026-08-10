# Doc Broto — Ferramentas de PDF

Suíte de ferramentas de PDF no estilo iLovePDF, para uso interno da empresa.
Construída com **Next.js 15 (App Router)**, **TypeScript** e **Tailwind CSS**.

O processamento acontece **no navegador** (client-side) sempre que possível,
usando `pdf-lib` e `pdf.js`. Isso garante privacidade (os arquivos não saem do
dispositivo do usuário) e reduz custo de servidor.

## Ferramentas já funcionais

| Ferramenta            | Descrição                                                  |
| --------------------- | ---------------------------------------------------------- |
| Juntar PDF            | Mescla vários PDFs, com reordenação                        |
| Dividir PDF           | Extrai intervalo de páginas ou separa cada página (ZIP)    |
| Comprimir PDF         | Reduz o tamanho (rasterização com níveis de qualidade)     |
| Rodar PDF             | Gira páginas em 90/180/270°                                 |
| Organizar PDF         | Reordena e exclui páginas com miniaturas                    |
| Números de página     | Adiciona numeração com posição e tamanho configuráveis      |
| Marca d'água          | Texto com transparência, tamanho e rotação                  |
| JPG para PDF          | Converte imagens JPG/PNG em PDF                              |
| PDF para JPG          | Exporta páginas como JPG (ZIP quando múltiplas)             |

As demais ferramentas aparecem na grade marcadas como **"Em breve"** —
a arquitetura está pronta para recebê-las.

## Rodar localmente

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # build de produção
```

## Próximas etapas (roadmap)

Ferramentas que exigem processamento no servidor (backend a implementar):

- **Conversões Office** (Word/Excel/PowerPoint ↔ PDF): via LibreOffice headless
  em um serviço backend (ex.: container em AWS ECS/Fargate ou função em
  AWS Lambda com layer do LibreOffice).
- **OCR / PDF pesquisável**: Tesseract ou serviço de OCR.
- **Proteger / Desbloquear PDF**: `pdf-lib` não cifra; usar `qpdf` no backend.
- **IA (Resumir, Traduzir, PDF → Markdown)**: via API da Claude/Anthropic.
- **HTML para PDF**: renderização headless (Playwright/Puppeteer) no backend.

## Arquitetura

- `src/lib/tools.ts` — registro único de ferramentas (dirige a grade da home).
  Para ativar uma ferramenta nova, marque `ready: true` e crie a página em
  `src/app/<slug>/page.tsx`.
- `src/components/` — UI compartilhada (grade, cards, dropzone, layout).
- `src/lib/` — utilitários (download, pdf.js, parsing de intervalos de página).

## Deploy

O frontend é estático/SSR e roda em qualquer plataforma Next.js (Vercel, ou
AWS Amplify). O backend de conversões (LibreOffice/OCR/IA) deve ser um serviço
separado — recomendado AWS ECS/Fargate ou Lambda — consumido via API routes.
