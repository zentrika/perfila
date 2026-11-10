import type { Metadata } from 'next';

import Editor from '@/components/editor/Editor';

export const metadata: Metadata = {
  title: 'Crear hoja de vida',
  description: 'Formulario guiado con vista previa en vivo y plantillas compatibles con ATS. Se guarda en tu navegador.',
};

export default function CrearPage() {
  return <Editor />;
}
