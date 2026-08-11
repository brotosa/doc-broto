export type ToolCategory =
  | "organizar"
  | "otimizar"
  | "converter"
  | "editar"
  | "seguranca"
  | "intelligence";

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  organizar: "Organizar PDF",
  otimizar: "Otimizar PDF",
  converter: "Converter PDF",
  editar: "Editar PDF",
  seguranca: "Segurança de PDF",
  intelligence: "PDF Intelligence",
};

export type Tool = {
  slug: string;
  title: string;
  description: string;
  category: ToolCategory;
  /** Tailwind color used for the icon tile. */
  color: string;
  /** Emoji/short glyph as a lightweight placeholder icon. */
  glyph: string;
  /** Whether the tool is implemented and clickable. */
  ready: boolean;
  /** "Novo!" badge like the reference site. */
  isNew?: boolean;
};

export const TOOLS: Tool[] = [
  {
    slug: "juntar-pdf",
    title: "Juntar PDF",
    description:
      "Mesclar e juntar PDFs e colocá-los em qualquer ordem que desejar. É tudo muito fácil e rápido!",
    category: "organizar",
    color: "bg-brand text-white",
    glyph: "⇲",
    ready: true,
  },
  {
    slug: "dividir-pdf",
    title: "Dividir PDF",
    description:
      "Selecione um intervalo de páginas, separe uma página, ou converta cada página do documento em arquivo PDF independente.",
    category: "organizar",
    color: "bg-brand text-white",
    glyph: "⇱",
    ready: true,
  },
  {
    slug: "comprimir-pdf",
    title: "Comprimir PDF",
    description:
      "Diminua o tamanho do seu arquivo PDF, mantendo a melhor qualidade possível. Otimize seus arquivos PDF.",
    category: "otimizar",
    color: "bg-brand-green text-white",
    glyph: "⇉",
    ready: true,
  },
  {
    slug: "pdf-para-word",
    title: "PDF para Word",
    description:
      "Converta facilmente seus ficheiros PDF para documentos WORD DOCX simples de editar.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "W",
    ready: true,
  },
  {
    slug: "pdf-para-powerpoint",
    title: "PDF para PowerPoint",
    description:
      "Converta seus ficheiros PDF para apresentações POWERPOINT PPTX fáceis de editar.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "P",
    ready: true,
  },
  {
    slug: "pdf-para-excel",
    title: "PDF para Excel",
    description:
      "Retire dados direto de PDFs para planilhas do Excel em poucos segundos.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "X",
    ready: true,
  },
  {
    slug: "word-para-pdf",
    title: "Word para PDF",
    description:
      "Converta seus documentos WORD para PDF com a máxima qualidade e exatamente igual que o arquivo DOC ou DOCX original.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "W",
    ready: true,
  },
  {
    slug: "powerpoint-para-pdf",
    title: "PowerPoint para PDF",
    description:
      "Converta suas apresentações POWERPOINT para PDF com a máxima qualidade e exatamente igual ao arquivo PPT ou PPTX original.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "P",
    ready: true,
  },
  {
    slug: "excel-para-pdf",
    title: "Excel para PDF",
    description:
      "Converta suas tabelas EXCEL para PDF com as colunas ajustadas à largura da página. Vertical ou horizontal, você escolhe a orientação.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "X",
    ready: true,
  },
  {
    slug: "editar-pdf",
    title: "Editar PDF",
    description:
      "Adicione texto, imagens, formas ou anotações livres a um documento PDF. Edite a dimensão, fonte e cor do conteúdo adicionado.",
    category: "editar",
    color: "bg-brand-green text-white",
    glyph: "✎",
    ready: true,
  },
  {
    slug: "pdf-para-jpg",
    title: "PDF para JPG",
    description:
      "Extraia todas as imagens contidas em um arquivo PDF ou converta cada página em um arquivo JPG.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "⇱",
    ready: true,
  },
  {
    slug: "jpg-para-pdf",
    title: "JPG para PDF",
    description:
      "Converta suas imagens JPG para PDF. Ajuste a orientação e as margens.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "JPG",
    ready: true,
  },
  {
    slug: "assinar-pdf",
    title: "Assinar PDF",
    description: "Assine você mesmo ou solicite assinaturas eletrônicas de outros.",
    category: "seguranca",
    color: "bg-brand-ink text-white",
    glyph: "✒",
    ready: true,
  },
  {
    slug: "marca-dagua",
    title: "Marca d'água",
    description:
      "Escolha uma imagem ou texto para inserir sobre o seu PDF. Selecione a posição, transparência e tipografia.",
    category: "editar",
    color: "bg-brand-green text-white",
    glyph: "❖",
    ready: true,
  },
  {
    slug: "rodar-pdf",
    title: "Rodar PDF",
    description: "Gire o PDF que quiser. Gire vários arquivos PDF de uma só vez!",
    category: "organizar",
    color: "bg-brand text-white",
    glyph: "↻",
    ready: true,
  },
  {
    slug: "html-para-pdf",
    title: "HTML para PDF",
    description:
      "Converta páginas Web em HTML para PDF. Copie e cole o URL da página que você quer e a converta em um PDF com um clique.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "&lt;/&gt;",
    ready: true,
  },
  {
    slug: "desbloquear-pdf",
    title: "Desbloquear PDF",
    description:
      "Remova a senha de segurança dos PDF, assim você pode usá-los como quiser.",
    category: "seguranca",
    color: "bg-brand-ink text-white",
    glyph: "🔓",
    ready: true,
  },
  {
    slug: "proteger-pdf",
    title: "Proteger PDF",
    description:
      "Proteja arquivos PDF com uma senha. Encripte documentos PDF para impedir o acesso não autorizado.",
    category: "seguranca",
    color: "bg-brand-ink text-white",
    glyph: "🔒",
    ready: true,
  },
  {
    slug: "organizar-pdf",
    title: "Organizar PDF",
    description:
      "Ordene as páginas de seu arquivo PDF como pretender. Exclua ou adicione páginas PDF ao seu documento como lhe for mais conveniente.",
    category: "organizar",
    color: "bg-brand text-white",
    glyph: "⇅",
    ready: true,
  },
  {
    slug: "pdf-para-pdfa",
    title: "PDF para PDF/A",
    description:
      "Transforme seu PDF em PDF/A, a versão de PDF em conformidade com os standards ISO para arquivo de longa duração.",
    category: "converter",
    color: "bg-brand text-white",
    glyph: "/A",
    ready: true,
  },
  {
    slug: "reparar-pdf",
    title: "Reparar PDF",
    description:
      "Reparar um PDF danificado e recuperar dados de PDF corrompido. Repare arquivos PDF com a nossa ferramenta de Reparo.",
    category: "otimizar",
    color: "bg-brand-green text-white",
    glyph: "🛠",
    ready: true,
  },
  {
    slug: "numeros-de-pagina",
    title: "Números de página",
    description:
      "Adicione números de página em documentos PDF facilmente. Escolha posição, dimensões, formato e tipografia!",
    category: "editar",
    color: "bg-brand-green text-white",
    glyph: "#",
    ready: true,
  },
  {
    slug: "digitalizar-pdf",
    title: "Digitalize e transforme em PDF",
    description:
      "Capture digitalizações de documentos a partir do seu dispositivo móvel e envie-os instantaneamente para o seu navegador.",
    category: "organizar",
    color: "bg-brand text-white",
    glyph: "📷",
    ready: true,
  },
  {
    slug: "ocr-pdf",
    title: "OCR PDF",
    description:
      "Converta facilmente um PDF escaneado em documentos selecionáveis e pesquisáveis.",
    category: "intelligence",
    color: "bg-brand-yellow text-brand-ink",
    glyph: "OCR",
    ready: true,
  },
  {
    slug: "comparar-pdf",
    title: "Comparar PDF",
    description:
      "Mostre uma comparação de documentos lado a lado e identifique facilmente as alterações entre diferentes versões de arquivos.",
    category: "editar",
    color: "bg-brand-green text-white",
    glyph: "⇄",
    ready: true,
  },
  {
    slug: "ocultar-pdf",
    title: "Ocultar PDF",
    description:
      "Oculte texto e gráficos para remover permanentemente informações sensíveis de um PDF.",
    category: "seguranca",
    color: "bg-brand-ink text-white",
    glyph: "▧",
    ready: true,
  },
  {
    slug: "recortar-pdf",
    title: "Recortar PDF",
    description:
      "Recorte as margens de documentos PDF ou selecione áreas específicas e depois aplique as alterações a uma página ou a todo o documento.",
    category: "editar",
    color: "bg-brand-green text-white",
    glyph: "⌗",
    ready: true,
  },
  {
    slug: "formularios-pdf",
    title: "Formulários PDF",
    description:
      "Detecte campos de formulário automaticamente, crie PDFs preenchíveis interativos ou preencha formulários em PDF manualmente.",
    category: "editar",
    color: "bg-brand-green text-white",
    glyph: "AБ",
    ready: true,
  },
  {
    slug: "resumir-com-ia",
    title: "Resumir com IA",
    description:
      "Gere rapidamente resumos concisos de artigos, parágrafos e ensaios, fornecendo pontos-chave claros e precisos em segundos.",
    category: "intelligence",
    color: "bg-brand-yellow text-brand-ink",
    glyph: "✦",
    ready: true,
  },
  {
    slug: "traduzir-pdf",
    title: "Traduzir PDF",
    description:
      "Traduza facilmente arquivos PDF com IA. Mantenha as fontes, o layout e a formatação perfeitamente intactos.",
    category: "intelligence",
    color: "bg-brand-yellow text-brand-ink",
    glyph: "文A",
    ready: true,
  },
  {
    slug: "pdf-para-markdown",
    title: "PDF para Markdown",
    description:
      "Converta facilmente PDFs em arquivos Markdown. Perfeito para anotações, documentos e LLMs. Títulos, tabelas, listas e links são preservados automaticamente.",
    category: "intelligence",
    color: "bg-brand-yellow text-brand-ink",
    glyph: "{#}",
    ready: true,
  },
];

export const READY_TOOLS = TOOLS.filter((t) => t.ready);

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
