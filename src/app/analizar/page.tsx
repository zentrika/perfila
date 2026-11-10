import type { Metadata } from 'next';

import Analyzer from '@/components/ats/Analyzer';

export const metadata: Metadata = {
  title: 'Analizar mi CV',
  description: 'Sube tu hoja de vida y mira cómo la lee un ATS: puntaje, errores de formato, secciones, contacto y palabras clave de la oferta.',
};

export default function AnalizarPage() {
  return <Analyzer />;
}
