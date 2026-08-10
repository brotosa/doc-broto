/**
 * Logo oficial do Broto (public/broto-logo.svg — convertido do PDF oficial
 * "Logo_Broto_Azul"). O tamanho é controlado pela altura; a largura acompanha
 * a proporção original (~5.28:1).
 */
export function BrotoLogo({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/broto-logo.svg"
      alt="broto"
      className={`h-7 w-auto ${className}`}
    />
  );
}
