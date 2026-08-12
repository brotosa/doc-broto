import "server-only";

import { getStore } from "./auth/store";

export type Privacy = {
  version: string;
  date: string; // exibição livre (ex.: 12/08/2026)
  content: string; // texto simples: "## título", "- item", linhas em branco separam parágrafos
};

// Texto inicial (usado enquanto o admin não editar pela tela).
export const DEFAULT_PRIVACY: Privacy = {
  version: "1.0",
  date: "12/08/2026",
  content: `Esta Política explica como o Broto PDF trata os dados ao usar a plataforma. Ao criar uma conta, você declara estar ciente e de acordo com os itens abaixo.

## 1. Dados que coletamos
- Cadastro: nome e e-mail, usados para identificar e liberar o seu acesso.
- Registro de uso: a cada ação numa ferramenta guardamos quem fez, qual ferramenta, o nome do arquivo e a data/hora.
- Segurança: eventos de login e de administração de contas.

## 2. Sobre os seus arquivos
A maioria das ferramentas processa o arquivo no seu próprio navegador. Quando o processamento ocorre no servidor (ex.: conversões, OCR), o arquivo é usado apenas durante a operação e descartado em seguida — não guardamos o conteúdo dos documentos. Registramos somente o nome do arquivo no log de uso.

## 3. Para que usamos
Controlar o acesso, manter a segurança, auditar o uso e entender que tipos de documento são tratados, para melhorar a ferramenta.

## 4. Compartilhamento
Não vendemos nem compartilhamos seus dados com terceiros. O acesso aos registros é restrito à administração do Broto.

## 5. Seus direitos
Conforme a LGPD, você pode solicitar acesso, correção ou exclusão dos seus dados cadastrais pelo contato com o administrador responsável.

O aceite desta Política (data, hora e nome) fica registrado no log de auditoria.`,
};

const KEY = "privacy_policy_text";

export async function getPrivacy(): Promise<Privacy> {
  await getStore().init();
  const saved = await getStore().getSetting<Partial<Privacy>>(KEY);
  return { ...DEFAULT_PRIVACY, ...(saved || {}) };
}

export async function savePrivacy(input: Partial<Privacy>): Promise<Privacy> {
  await getStore().init();
  const str = (v: unknown, def: string, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : def;
  const privacy: Privacy = {
    version: str(input.version, DEFAULT_PRIVACY.version, 40),
    date: str(input.date, DEFAULT_PRIVACY.date, 40),
    content: typeof input.content === "string" && input.content.trim()
      ? input.content.slice(0, 20000)
      : DEFAULT_PRIVACY.content,
  };
  await getStore().setSetting(KEY, privacy);
  return privacy;
}
