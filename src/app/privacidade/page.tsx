import { PrivacyPolicyText } from "@/components/PrivacyPolicyText";

export const metadata = { title: "Política de Privacidade — Broto PDF" };

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Política de Privacidade</h1>
      <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8">
        <PrivacyPolicyText />
      </div>
    </div>
  );
}
