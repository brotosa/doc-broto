# Identidade Broto — resumo aplicado

Fonte: `brand/GuiaDeMarca-Broto-2022.pdf` (Guia de marca Broto, 2022).

## Cores (tokens em `tailwind.config.ts`)

| Papel | Nome | HEX | Pantone / RGB |
| --- | --- | --- | --- |
| Ação / links (primária) | `brand.DEFAULT` (azul) | `#465EFF` | PANTONE 2369 C · RGB 70 94 255 |
| Destaque / hero (primária) | `brand.yellow` | `#FCFC30` | PANTONE 3945 C · RGB 252 252 48 |
| Secundária / sucesso / "Novo!" | `brand.green` | `#38DC6A` | PANTONE 7479 C · RGB 56 220 106 |
| Texto escuro (secundária) | `brand.ink` | `#282313` | PANTONE Black 4 C · RGB 40 35 19 |
| Base | branco | `#FFFFFF` | — |

Regra de proporção: **principais (amarelo, azul, branco) predominam**; secundárias
(verde, marrom) entram **pontualmente**.

## Tipografia

- **Gordita** — tipografia oficial da marca (comercial, [MyFonts](https://www.myfonts.com/fonts/type-atelier/gordita/)).
- **Verdana** — fonte de sistema / fallback definida pela própria marca.
- Stack aplicada: `"Gordita", Verdana, Geneva, sans-serif`. Se a empresa licenciar a
  Gordita e disponibilizá-la (via `@font-face`/CDN interno), ela é usada automaticamente;
  caso contrário, cai para Verdana, conforme o manual.

## Elementos visuais

- **Cantos arredondados** em tudo (cards, chips, botões, tiles).
- **Logo** recriado em SVG (`src/components/Logo.tsx`): símbolo de "broto" (traços que
  crescem e curvam, verde `#38DC6A` + azul `#465EFF`) + wordmark "broto" em azul.
- **Grafismo**: linhas de conexão, círculos e quadrados de cantos arredondados.
- **Ícones**: estilo de linha, desenho "aberto" (nunca fechado), cantos arredondados.
- **Tiles das ferramentas** coloridos por categoria dentro da paleta:
  organizar/converter → azul · otimizar/editar → verde · segurança → marrom (ink) ·
  intelligence → amarelo.

> O logo/símbolo é uma **recriação fiel** em SVG para uso na web. Para produção final,
> substitua por arquivos oficiais da marca (SVG/PNG) se disponíveis.
