import type { FontChoice, TemplateId } from '@/lib/cv/types';

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
  usesAccent: boolean;
  /** Carácter de viñeta (texto real, para que el ATS lo lea). */
  bullet: string;
  /** Separador entre los datos de contacto. */
  sep: string;
  /** Tipografía que usa la plantilla cuando la elección es «Automática». */
  font: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'moderna',
    name: 'Moderna',
    description: 'Nombre grande, títulos con color de acento y líneas finas. Para tecnología, producto y marketing.',
    usesAccent: true,
    bullet: '•',
    sep: ' | ',
    font: 'Arial',
  },
  {
    id: 'tecnica',
    name: 'Técnica',
    description: 'Sans serif limpia, títulos en franja con barra de color y lectura rápida. Pensada para perfiles de tecnología.',
    usesAccent: true,
    bullet: '•',
    sep: ' | ',
    font: 'Aptos o Calibri',
  },
  {
    id: 'elegante',
    name: 'Elegante',
    description: 'Nombre en versalitas con apellido en negrita, títulos espaciados y contenido con sangría. Sobria y con mucho aire.',
    usesAccent: false,
    bullet: '▪',
    sep: ' • ',
    font: 'Georgia + Arial',
  },
  {
    id: 'contraste',
    name: 'Contraste',
    description: 'Encabezado en bloque oscuro con el nombre en blanco y franja de contacto. Impacto visual en una sola columna.',
    usesAccent: true,
    bullet: '▪',
    sep: ' | ',
    font: 'Arial',
  },
  {
    id: 'clasica',
    name: 'Clásica',
    description: 'Tipografía serif y encabezado centrado. Para derecho, finanzas, salud y sector público.',
    usesAccent: false,
    bullet: '•',
    sep: ' | ',
    font: 'Georgia',
  },
  {
    id: 'ejecutiva',
    name: 'Ejecutiva',
    description: 'Compacta, con barra de color en el encabezado. Para perfiles con mucha experiencia en una o dos páginas.',
    usesAccent: true,
    bullet: '•',
    sep: ' | ',
    font: 'Arial',
  },
  {
    id: 'minimal',
    name: 'Mínima',
    description: 'Solo texto negro en Arial, sin líneas ni color. La más compatible con cualquier ATS.',
    usesAccent: false,
    bullet: '•',
    sep: ' | ',
    font: 'Arial',
  },
];

export const templateMeta = (id: TemplateId): TemplateMeta => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export const FONTS: { value: FontChoice; label: string; word: string }[] = [
  { value: 'auto', label: 'La de la plantilla', word: 'Calibri' },
  { value: 'arial', label: 'Arial', word: 'Arial' },
  { value: 'calibri', label: 'Calibri', word: 'Calibri' },
  { value: 'aptos', label: 'Aptos', word: 'Aptos' },
  { value: 'georgia', label: 'Georgia (serif)', word: 'Georgia' },
  { value: 'cambria', label: 'Cambria (serif)', word: 'Cambria' },
];
