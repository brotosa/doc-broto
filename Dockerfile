# syntax=docker/dockerfile:1

###############################################################################
# Broto PDF — imagem única (Next.js + binários de processamento de documentos)
# Estágios: deps -> builder -> runner (standalone).
###############################################################################

# ---------- deps: instala dependências Node ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder: compila o Next.js (output standalone) ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runner: imagem final ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Chromium do sistema para o HTML->PDF (Playwright usa este caminho).
    CHROMIUM_PATH=/usr/bin/chromium \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Binários de processamento de documentos:
#  - libreoffice-{writer,calc,impress}: conversões Office <-> PDF (filtros de importação)
#  - qpdf: proteger / desbloquear PDF
#  - ghostscript: comprimir, PDF/A, reparar
#  - poppler-utils: extração de texto/imagem (pdftotext)
#  - tesseract + ocrmypdf: OCR (idiomas por/eng)
#  - chromium: HTML -> PDF
#  - python3 + libs (pip): PDF -> Word/PowerPoint/Excel (pdf2docx, PyMuPDF, python-pptx, openpyxl)
#  - fonts-*: renderização fiel de documentos
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-writer libreoffice-calc libreoffice-impress \
      qpdf ghostscript poppler-utils \
      tesseract-ocr tesseract-ocr-por tesseract-ocr-eng ocrmypdf \
      chromium \
      python3 python3-pip libglib2.0-0 libgl1 libgomp1 \
      fonts-liberation fonts-dejavu-core fontconfig \
      dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Motores de conversão PDF -> Office (Python)
RUN pip3 install --no-cache-dir --break-system-packages \
      pdf2docx==0.5.13 python-pptx==1.0.2 openpyxl==3.1.5 \
    && rm -rf /root/.cache/pip

# Usuário não-root
RUN groupadd -r broto && useradd -r -g broto -m -d /home/broto broto

# Artefatos do build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=broto:broto /app/.next/standalone ./
COPY --from=builder --chown=broto:broto /app/.next/static ./.next/static

# LibreOffice precisa de HOME gravável para o perfil
ENV HOME=/home/broto
USER broto

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
