import "server-only";

import { getStore } from "./store";

// Política jurídica / de assinatura digital (editável pelo admin):
//  - tsaUrl: endereço do servidor de carimbo de tempo (RFC3161). O padrão é um
//    TSA público gratuito; troque por uma ACT credenciada ICP-Brasil (AD-RT).
//  - timestampDefault: se a opção "incluir carimbo de tempo" já vem marcada.
export type SignPolicy = { tsaUrl: string; timestampDefault: boolean };

export const DEFAULT_TSA_URL = "http://timestamp.digicert.com";
export const DEFAULT_SIGN_POLICY: SignPolicy = { tsaUrl: DEFAULT_TSA_URL, timestampDefault: false };

const KEY = "sign_policy";

export async function getSignPolicy(): Promise<SignPolicy> {
  await getStore().init();
  const saved = await getStore().getSetting<Partial<SignPolicy>>(KEY);
  return { ...DEFAULT_SIGN_POLICY, ...(saved || {}) };
}

export async function saveSignPolicy(input: Partial<SignPolicy>): Promise<SignPolicy> {
  await getStore().init();
  let tsaUrl = String(input.tsaUrl ?? "").trim();
  // Aceita apenas http(s); vazio volta ao padrão gratuito.
  if (!/^https?:\/\//i.test(tsaUrl)) tsaUrl = DEFAULT_TSA_URL;
  const policy: SignPolicy = {
    tsaUrl: tsaUrl.slice(0, 300),
    timestampDefault: !!input.timestampDefault,
  };
  await getStore().setSetting(KEY, policy);
  return policy;
}
