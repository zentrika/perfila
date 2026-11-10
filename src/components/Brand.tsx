import isotipo from '@/design-system/logo/zentrika-isotipo-plano.svg';
import wordmarkDark from '@/design-system/logo/zentrika-wordmark-blanco.svg';
import wordmarkLight from '@/design-system/logo/zentrika-wordmark-obsidiana.svg';

/** Firma del producto según la arquitectura de marca: «Perfila — by ZENTRIKA». */
export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup${compact ? ' is-compact' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={isotipo.src} alt="" width={26} height={26} className="brand-iso" />
      <span className="brand-product">Perfila</span>
      <span className="brand-by" aria-label="by ZENTRIKA">
        <span aria-hidden="true">by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wordmarkDark.src} alt="" className="brand-word on-dark" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wordmarkLight.src} alt="" className="brand-word on-light" />
      </span>
    </span>
  );
}
