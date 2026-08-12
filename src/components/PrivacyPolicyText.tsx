// Renderiza o texto da Política de Privacidade (editável pelo admin).
// Formato simples do conteúdo:
//   "## Título"  -> subtítulo
//   "- item"     -> item de lista
//   linha vazia  -> separa blocos/parágrafos
export function PrivacyPolicyBody({
  version,
  date,
  content,
}: {
  version: string;
  date: string;
  content: string;
}) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length) { blocks.push(<p key={key++}>{para.join(" ")}</p>); para = []; }
  };
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      );
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushBullets(); continue; }
    if (line.startsWith("## ")) {
      flushPara(); flushBullets();
      blocks.push(<h3 key={key++} className="font-semibold text-gray-800">{line.slice(3)}</h3>);
    } else if (line.startsWith("- ")) {
      flushPara();
      bullets.push(line.slice(2));
    } else {
      flushBullets();
      para.push(line);
    }
  }
  flushPara(); flushBullets();

  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-600">
      <p className="text-xs text-gray-400">Versão {version} — {date}</p>
      {blocks}
    </div>
  );
}
