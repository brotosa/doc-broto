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

/** Screenshot ilustrativo (telas reais do app, em /public/ajuda). */
function Shot({ name, alt }: { name: string; alt: string }) {
  return (
    <img
      src={`/ajuda/${name}.png`}
      alt={alt}
      loading="lazy"
      className="mt-4 w-full rounded-xl border border-gray-200 shadow-sm"
    />
  );
}

function ToolBlock({ slug }: { slug: string }) {
  const t = TOOLS.find((x) => x.slug === slug)!;
  return (
    <section id={`tool-${slug}`} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold ${t.color}`}>
          <span dangerouslySetInnerHTML={{ __html: t.glyph }} />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{t.title}</h3>
          {t.isNew && <span className="text-xs font-semibold text-brand">Novo!</span>}
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-600">{t.description}</p>
      <Steps slug={slug} />
      <Shot name={slug} alt={`Tela da ferramenta ${t.title}`} />
    </section>
  );
}

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Cabeçalho */}
      <div className="rounded-3xl bg-brand p-8 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Manual do usuário</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Como usar o Broto PDF</h1>
        <p className="mt-2 max-w-2xl text-white/90">
          Um guia ilustrado de tudo: desde criar a conta até usar cada uma das {TOOLS.length} ferramentas, com telas
          reais do sistema.
        </p>
      </div>

      {/* Índice */}
      <nav className="mt-8 flex flex-wrap gap-2 text-sm">
        <a href="#comecar" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">Primeiros passos</a>
        <a href="#fluxo" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">Como usar</a>
        {CAT_ORDER.map((c) => (
          <a key={c} href={`#cat-${c}`} className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">
            {CATEGORY_LABELS[c]}
          </a>
        ))}
        <a href="#admin" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">Administração</a>
        <a href="#privacidade" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">Privacidade</a>
      </nav>

      {/* Primeiros passos */}
      <section id="comecar" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-gray-900">Primeiros passos</h2>
        <div className="mt-4 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Criar sua conta</h3>
            <p className="mt-2 text-sm text-gray-600">
              Na tela inicial, escolha <b>Criar conta</b>, informe e-mail, nome e senha, marque
              <b> Li e aceito a Política de Privacidade</b> e envie. A conta fica <b>pendente</b> até o
              administrador aprovar. O aceite da política fica registrado (nome, data e hora).
            </p>
            <Shot name="fluxo-criar-conta" alt="Tela de criar conta" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Entrar</h3>
            <p className="mt-2 text-sm text-gray-600">
              Em <b>Entrar</b>, informe e-mail e senha. Após alguns minutos sem atividade, por segurança, a
              sessão expira e você volta para esta tela.
            </p>
            <Shot name="fluxo-login" alt="Tela de login" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Trocar a senha</h3>
            <p className="mt-2 text-sm text-gray-600">
              Já logado, clique no seu nome no canto superior direito e em <b>Trocar senha</b>. Informe a senha
              atual e a nova (seguindo a política de senha configurada).
            </p>
            <Shot name="fluxo-trocar-senha" alt="Tela de trocar senha" />
          </div>
        </div>
      </section>

      {/* Como usar */}
      <section id="fluxo" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-gray-900">Como usar uma ferramenta</h2>
        <p className="mt-2 text-sm text-gray-600">
          Na página inicial, escolha a ferramenta desejada. Em geral: <b>envie o arquivo</b> (arraste ou clique),
          <b> ajuste as opções</b> se houver, clique no botão de ação e <b>baixe o resultado</b>. As conversões
          mostram uma barra de progresso.
        </p>
        <Shot name="fluxo-home" alt="Página inicial com as ferramentas" />
      </section>

      {/* Ferramentas por categoria */}
      {CAT_ORDER.map((cat) => {
        const tools = TOOLS.filter((t) => t.category === cat);
        if (!tools.length) return null;
        return (
          <section key={cat} id={`cat-${cat}`} className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-bold text-gray-900">{CATEGORY_LABELS[cat]}</h2>
            <div className="mt-4 space-y-6">
              {tools.map((t) => (
                <ToolBlock key={t.slug} slug={t.slug} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Administração */}
      <section id="admin" className="mt-14 scroll-mt-24">
        <h2 className="text-2xl font-bold text-gray-900">Painel do administrador</h2>
        <p className="mt-2 text-sm text-gray-600">
          Disponível para contas <b>admin</b>, em <b>Configurações</b>. Reúne gestão de usuários, políticas e
          histórico.
        </p>
        <div className="mt-4 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Configurações</h3>
            <p className="mt-2 text-sm text-gray-600">
              Aprove, ative/desative, promova e exclua usuários; crie novos; defina a <b>política de senha</b> e
              edite o texto da <b>Política de Privacidade</b>.
            </p>
            <Shot name="admin-configuracoes" alt="Aba Configurações" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Segurança</h3>
            <p className="mt-2 text-sm text-gray-600">
              <b>Bloqueio por senha errada</b> (anti brute-force), <b>limite de tentativas por IP</b> (anti-flood /
              DDoS) em login e cadastro, e <b>tempo de sessão inativa</b>.
            </p>
            <Shot name="admin-seguranca" alt="Aba Segurança" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Logs</h3>
            <p className="mt-2 text-sm text-gray-600">
              Histórico de auditoria (login, gestão de usuários, alterações de política) com <b>filtros</b> e
              data/hora em colunas.
            </p>
            <Shot name="admin-logs" alt="Aba Logs" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Atividade</h3>
            <p className="mt-2 text-sm text-gray-600">
              Registro de uso das ferramentas: quem fez o quê, em qual arquivo e quando — também com filtros.
            </p>
            <Shot name="admin-atividade" alt="Aba Atividade" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Jurídico</h3>
            <p className="mt-2 text-sm text-gray-600">
              Configura a <b>assinatura digital</b> (endereço do carimbo de tempo / ACT credenciada) e concentra a
              <b> Política de Privacidade</b>.
            </p>
            <Shot name="admin-juridico" alt="Aba Jurídico" />
          </div>
        </div>
      </section>

      {/* Privacidade */}
      <section id="privacidade" className="mt-14 scroll-mt-24">
        <h2 className="text-2xl font-bold text-gray-900">Privacidade e dados</h2>
        <p className="mt-2 text-sm text-gray-600">
          A Política de Privacidade fica sempre acessível na página <b>/privacidade</b> e é aceita no cadastro. O
          texto é editável pelo administrador.
        </p>
        <Shot name="fluxo-privacidade" alt="Página de Política de Privacidade" />
      </section>
    </div>
  );
}
