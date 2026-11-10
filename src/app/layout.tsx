import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import '@/design-system/tokens/tokens.css';
import './globals.css';
import './cv.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import favicon from '@/design-system/logo/zentrika-favicon.svg';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { PRODUCT, SITE_URL, TAGLINE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${PRODUCT} — by ZENTRIKA`, template: `%s · ${PRODUCT}` },
  description: `${TAGLINE} Crea tu hoja de vida con plantillas compatibles con ATS y analiza la que ya tienes. Gratis y sin registro.`,
  applicationName: PRODUCT,
  icons: { icon: favicon.src },
  openGraph: {
    type: 'website',
    siteName: `${PRODUCT} — by ZENTRIKA`,
    locale: 'es_CO',
    title: '¿Tu hoja de vida pasa el filtro ATS? — Perfila',
    description: 'Crea tu CV con plantillas que los ATS sí leen o analiza el que ya tienes. Gratis, sin registro y de código abierto.',
    images: [{ url: '/og.jpg', width: 1200, height: 627, alt: 'Perfila — by ZENTRIKA: hojas de vida compatibles con ATS' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.jpg'] },
};

export const viewport: Viewport = { themeColor: '#080F1A' };

// Aplica el tema guardado antes de pintar, para que no parpadee al recargar.
const themeScript = `try{var t=localStorage.getItem('perfila:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <div className="app-shell">
          <SiteHeader />
          <main id="contenido">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
