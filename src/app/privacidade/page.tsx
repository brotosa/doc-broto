import { PrivacyPolicyBody } from "@/components/PrivacyPolicyText";
import { getPrivacy } from "@/lib/privacy";

export const metadata = { title: "Política de Privacidade — Broto PDF" };
export const dynamic = "force-dynamic"; // sempre reflete a versão salva pelo admin

export default async function PrivacidadePage() {
  const p = await getPrivacy();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Política de Privacidade</h1>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8">
        <PrivacyPolicyBody version={p.version} date={p.date} content={p.content} />
      </div>
    </div>
  );
}
