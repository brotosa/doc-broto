// Texto da Política de Privacidade, reutilizado no cadastro (modal) e na
// página /privacidade. Ao mudar o conteúdo, atualize POLICY_VERSION — a versão
// aceita fica registrada no log de auditoria.
export const POLICY_VERSION = "1.0";
export const POLICY_DATE = "12/08/2026";

export function PrivacyPolicyText() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-600">
      <p className="text-xs text-gray-400">Versão {POLICY_VERSION} — {POLICY_DATE}</p>

      <p>
        Esta Política explica como o <b>Broto PDF</b> trata os dados ao usar a plataforma.
        Ao criar uma conta, você declara estar ciente e de acordo com os itens abaixo.
      </p>

      <div>
        <h3 className="font-semibold text-gray-800">1. Dados que coletamos</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li><b>Cadastro:</b> nome e e-mail, usados para identificar e liberar o seu acesso.</li>
          <li><b>Registro de uso:</b> a cada ação numa ferramenta guardamos <b>quem</b> fez,
            <b> qual ferramenta</b>, o <b>nome do arquivo</b> e a <b>data/hora</b>.</li>
          <li><b>Segurança:</b> eventos de login e de administração de contas.</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800">2. Sobre os seus arquivos</h3>
        <p className="mt-1">
          A maioria das ferramentas processa o arquivo no seu próprio navegador. Quando o
          processamento ocorre no servidor (ex.: conversões, OCR), o arquivo é usado apenas
          durante a operação e <b>descartado em seguida</b> — não guardamos o conteúdo dos
          documentos. Registramos somente o <b>nome</b> do arquivo no log de uso.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800">3. Para que usamos</h3>
        <p className="mt-1">
          Controlar o acesso, manter a segurança, auditar o uso e entender que tipos de
          documento são tratados, para melhorar a ferramenta.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800">4. Compartilhamento</h3>
        <p className="mt-1">
          Não vendemos nem compartilhamos seus dados com terceiros. O acesso aos registros é
          restrito à administração do Broto.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800">5. Seus direitos</h3>
        <p className="mt-1">
          Conforme a LGPD, você pode solicitar acesso, correção ou exclusão dos seus dados
          cadastrais pelo contato com o administrador responsável.
        </p>
      </div>

      <p className="text-xs text-gray-400">
        O aceite desta Política (data, hora e nome) fica registrado no log de auditoria.
      </p>
    </div>
  );
}
