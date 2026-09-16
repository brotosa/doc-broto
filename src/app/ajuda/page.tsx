import { TOOLS, CATEGORY_LABELS, type ToolCategory } from "@/lib/tools";
import { HELP_STEPS } from "@/lib/help";
import { HelpShot as Shot } from "@/components/HelpShot";

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
        <a href="#pdf-senha" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">PDFs com senha</a>
        <a href="#novidades" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-200">Novidades</a>
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

      {/* PDFs protegidos por senha */}
      <section id="pdf-senha" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-gray-900">PDFs protegidos por senha</h2>
        <p className="mt-2 text-sm text-gray-600">
          Um PDF pode estar protegido de <b>duas formas diferentes</b>. Entender a diferença ajuda a saber o que é
          possível — e o que não é.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand-green/40 bg-brand-green/5 p-5">
            <h3 className="text-base font-bold text-gray-900">Apenas restrições</h3>
            <p className="mt-2 text-sm text-gray-600">
              O PDF <b>abre normalmente</b>, mas bloqueia imprimir, copiar ou editar. Essas restrições são do
              <b> dono</b> do arquivo.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-800">
              ✅ Podemos remover <b>sem precisar de senha</b>. As conversões (Word, Excel, etc.) já funcionam
              normalmente com esses arquivos.
            </p>
          </div>
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5">
            <h3 className="text-base font-bold text-gray-900">Senha de abertura</h3>
            <p className="mt-2 text-sm text-gray-600">
              O PDF <b>pede uma senha para abrir</b>. O conteúdo fica <b>criptografado</b> — ninguém, nem o sistema,
              consegue ler os dados sem a senha correta.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-800">
              🔒 Se você <b>tem a senha</b>, informe-a no campo <b>“PDF protegido por senha?”</b> e o arquivo é
              desbloqueado e convertido num passo só. Se você <b>não tem a senha</b>, <b>não há como recuperá-lo</b> —
              solicite o arquivo original a quem o enviou.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          <b>Vale também para Word, Excel e PowerPoint:</b> se o arquivo pede senha para <b>abrir</b>, informe-a no
          campo “Arquivo protegido por senha?”. Já se o arquivo <b>abre normalmente</b> mas tem apenas
          <b> restrições internas</b> (bloquear imprimir, editar ou preencher campos), a conversão <b>funciona sem
          senha</b> — o PDF gerado sai sem essas travas.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          A senha informada é usada apenas para abrir o arquivo naquela conversão e não é armazenada.
        </p>
        <Shot name="pdf-senha" alt="Campo “PDF protegido por senha?” em uma conversão" />
      </section>

      {/* Novidades / recursos gerais */}
      <section id="novidades" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold text-gray-900">Novidades e recursos gerais</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">📦 Conversão em lote</h3>
            <p className="mt-2 text-sm text-gray-600">
              Nas conversões (Word, Excel, PowerPoint, CSV, Markdown, JSON, PDF/A, tons de cinza), selecione
              <b> vários arquivos de uma vez</b>. Cada um é processado e você recebe um <b>.zip</b> com todos.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">🕓 Meu histórico</h3>
            <p className="mt-2 text-sm text-gray-600">
              No topo, <b>Meu histórico</b> mostra as últimas ferramentas que você usou, para reabrir rápido.
              Por privacidade, <b>os arquivos não são guardados</b> — só o registro.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">🌙 Modo escuro</h3>
            <p className="mt-2 text-sm text-gray-600">
              Use o botão de <b>lua/sol</b> no topo para alternar entre claro e escuro. Sua preferência fica salva.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">⌨️ Atalhos de teclado</h3>
            <p className="mt-2 text-sm text-gray-600">
              Pressione <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 text-xs">?</kbd> para ver os
              atalhos: <b>/</b> foca a busca, <b>g h</b> vai ao início, <b>g a</b> à Ajuda, <b>d</b> alterna o tema.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">📲 Instalar como app (PWA)</h3>
            <p className="mt-2 text-sm text-gray-600">
              No navegador, use <b>Instalar aplicativo</b> para abrir o Broto PDF direto da área de trabalho ou do
              celular, como um app.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">⚠️ Aviso de PDF escaneado</h3>
            <p className="mt-2 text-sm text-gray-600">
              Ao converter um PDF que é <b>imagem</b> (escaneado), o sistema avisa que o texto pode não vir
              editável e sugere usar o <b>OCR</b> antes.
            </p>
          </div>
        </div>
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
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Limites</h3>
            <p className="mt-2 text-sm text-gray-600">
              Defina o <b>tamanho máximo por arquivo</b> (MB), o <b>tempo máximo de conversão</b> (segundos) e o
              <b> máximo de arquivos por lote</b>. Valem para todas as ferramentas.
            </p>
            <Shot name="admin-limites" alt="Aba Limites" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900">Métricas</h3>
            <p className="mt-2 text-sm text-gray-600">
              Painel de uso: total de conversões, uso dos <b>últimos 7 dias</b>, <b>usuários ativos</b>, gráfico de
              uso por dia e ranking das <b>ferramentas e usuários mais ativos</b>.
            </p>
            <Shot name="admin-metricas" alt="Aba Métricas" />
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
