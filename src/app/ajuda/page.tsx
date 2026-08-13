import Link from "next/link";
import { TOOLS, CATEGORY_LABELS, type ToolCategory } from "@/lib/tools";
import { HELP_STEPS } from "@/lib/help";

export const metadata = { title: "Ajuda — Broto PDF" };

const CAT_ORDER: ToolCategory[] = ["organizar", "converter", "editar", "otimizar", "seguranca", "intelligence"];

function Steps({ slug }: { slug: string }) {
  const steps = HELP_STEPS[slug] || ["Envie o arquivo.", "Ajuste as opções, se houver.", "Baixe o resultado."];
  return (
    <ol className="mt-3 space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-600">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
            {i + 1}
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* Cabeçalho */}
      <div className="rounded-3xl bg-brand p-8 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Ajuda</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Como usar o Broto PDF</h1>
        <p className="mt-2 max-w-2xl text-white/90">
          Um guia rápido de tudo: desde entrar na conta até usar cada uma das {TOOLS.length} ferramentas.
        </p>
      </div>

      {/* Índice */}
      <nav className="mt-8 flex flex-wrap gap-2 text-sm">
        <a href="#comecar" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">Começar</a>
        <a href="#fluxo" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">Como usar</a>
        {CAT_ORDER.map((c) => (
          <a key={c} href={`#cat-${c}`} className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">
            {CATEGORY_LABELS[c]}
          </a>
        ))}
        <a href="#privacidade" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">Privacidade</a>
      </nav>

      {/* Começar */}
      <section id="comecar" className="mt-12 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900">Primeiros passos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="font-semibold text-gray-800">Criar conta</h3>
            <p className="mt-1 text-sm text-gray-600">
              Em <b>Criar conta</b>, informe e-mail, nome e senha, marque <b>Li e aceito a Política de Privacidade</b> e envie.
              A conta fica pendente até o administrador aprovar.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="font-semibold text-gray-800">Entrar e senha</h3>
            <p className="mt-1 text-sm text-gray-600">
              Entre com e-mail e senha. Você pode trocar a senha em{" "}
              <Link href="/trocar-senha" className="font-semibold text-brand hover:underline">Trocar senha</Link>.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:col-span-2">
            <h3 className="font-semibold text-gray-800">Sessão por inatividade</h3>
            <p className="mt-1 text-sm text-gray-600">
              Por segurança, após um tempo parado o sistema desconecta e volta ao login. Fechar o navegador mantém
              você logado dentro desse tempo (definido pelo administrador).
            </p>
          </div>
        </div>
      </section>

      {/* Como usar */}
      <section id="fluxo" className="mt-12 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900">Como usar uma ferramenta</h2>
        <p className="mt-1 text-gray-600">O funcionamento é sempre o mesmo, em 3 passos:</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Envie o arquivo", "Arraste para a área indicada ou clique para selecionar."],
            ["Ajuste e processe", "Configure as opções (quando houver) e clique no botão de ação."],
            ["Baixe o resultado", "Na tela “Documento concluído!”, clique em Baixar arquivo — ou Gerar novo."],
          ].map(([t, d], i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold text-gray-800">{t}</h3>
              <p className="mt-1 text-sm text-gray-600">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-brand/5 px-4 py-3 text-sm text-gray-600">
          🔒 Seus arquivos não ficam guardados: a maioria é processada no próprio navegador e, quando é no servidor,
          o arquivo é descartado logo após. Registramos apenas o <b>nome</b> do arquivo no log de uso.
        </p>
      </section>

      {/* Catálogo por categoria */}
      {CAT_ORDER.map((cat) => {
        const tools = TOOLS.filter((t) => t.category === cat);
        if (!tools.length) return null;
        return (
          <section key={cat} id={`cat-${cat}`} className="mt-12 scroll-mt-20">
            <div className="mb-4 border-t-2 border-brand pt-4">
              <h2 className="text-2xl font-bold text-gray-900">{CATEGORY_LABELS[cat]}</h2>
              <p className="text-sm text-gray-500">{tools.length} ferramentas</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {tools.map((t) => (
                <div key={t.slug} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${t.color}`}>
                      {t.glyph}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{t.title}</h3>
                      <p className="mt-0.5 text-sm text-gray-500">{t.description}</p>
                    </div>
                  </div>
                  <Steps slug={t.slug} />
                  <Link
                    href={`/${t.slug}`}
                    className="mt-4 inline-flex w-fit items-center gap-1 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/20"
                  >
                    Abrir ferramenta →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Privacidade */}
      <section id="privacidade" className="mt-12 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900">Privacidade e dados</h2>
        <p className="mt-1 max-w-2xl text-gray-600">
          Coletamos apenas o necessário: cadastro (nome e e-mail) e um registro de uso (quem, qual ferramenta, nome do
          arquivo e data/hora). O conteúdo dos documentos não é armazenado. Leia a{" "}
          <Link href="/privacidade" className="font-semibold text-brand hover:underline">Política de Privacidade</Link>{" "}
          completa. Dúvidas: <b>privacidade@broto.com.br</b>.
        </p>
      </section>
    </div>
  );
}
