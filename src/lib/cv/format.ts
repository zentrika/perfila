import type { CvData, CvLang, DateStyle, LanguageLevel, SectionKey, WorkMode } from './types';

/** Títulos de sección estándar: los que los ATS reconocen sin ambigüedad. */
export const SECTION_TITLES: Record<CvLang, Record<SectionKey, string>> = {
  es: {
    summary: 'Perfil profesional',
    experience: 'Experiencia laboral',
    education: 'Educación',
    skills: 'Habilidades',
    certifications: 'Certificaciones',
    projects: 'Proyectos',
    languages: 'Idiomas',
  },
  en: {
    summary: 'Professional Summary',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    certifications: 'Certifications',
    projects: 'Projects',
    languages: 'Languages',
  },
};

export const SECTION_LABELS_UI: Record<SectionKey, string> = SECTION_TITLES.es;

const MONTHS_SHORT: Record<CvLang, string[]> = {
  es: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const MONTHS_UI = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const PRESENT: Record<CvLang, string> = { es: 'Actualidad', en: 'Present' };

const MODES: Record<CvLang, Record<Exclude<WorkMode, ''>, string>> = {
  es: { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' },
  en: { presencial: 'On-site', hibrido: 'Hybrid', remoto: 'Remote' },
};

const LEVELS: Record<CvLang, Record<LanguageLevel, string>> = {
  es: { nativo: 'Nativo', C2: 'Maestría (C2)', C1: 'Avanzado (C1)', B2: 'Intermedio alto (B2)', B1: 'Intermedio (B1)', A2: 'Básico (A2)', A1: 'Principiante (A1)' },
  en: { nativo: 'Native', C2: 'Proficient (C2)', C1: 'Advanced (C1)', B2: 'Upper intermediate (B2)', B1: 'Intermediate (B1)', A2: 'Elementary (A2)', A1: 'Beginner (A1)' },
};

export const LEVEL_OPTIONS: { value: LanguageLevel; label: string }[] = (Object.keys(LEVELS.es) as LanguageLevel[]).map((k) => ({
  value: k,
  label: LEVELS.es[k],
}));

export function formatYm(value: string, lang: CvLang, style: DateStyle): string {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(value.trim());
  if (!m) return '';
  const year = m[1];
  const month = m[2] ? Number(m[2]) : 0;
  if (!month) return year;
  return style === 'numeric' ? `${String(month).padStart(2, '0')}/${year}` : `${MONTHS_SHORT[lang][month - 1]} ${year}`;
}

export function formatRange(start: string, end: string, current: boolean, lang: CvLang, style: DateStyle): string {
  const a = formatYm(start, lang, style);
  const b = current ? PRESENT[lang] : formatYm(end, lang, style);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

export function formatMode(mode: WorkMode, lang: CvLang): string {
  return mode ? MODES[lang][mode] : '';
}

export function formatLevel(level: LanguageLevel, lang: CvLang): string {
  return LEVELS[lang][level];
}

/** Quita el protocolo para mostrar enlaces cortos y legibles (los ATS leen el texto, no el hipervínculo). */
export function displayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

export function hrefFor(url: string): string {
  const u = url.trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function contactParts(cv: CvData): string[] {
  const p = cv.personal;
  const place = [p.city, p.country].map((s) => s.trim()).filter(Boolean).join(', ');
  return [place, p.email.trim(), p.phone.trim(), displayUrl(p.linkedin), displayUrl(p.website)].filter(Boolean);
}

export function visibleSections(cv: CvData): SectionKey[] {
  return cv.settings.order.filter((k) => !cv.settings.hidden.includes(k) && sectionHasContent(cv, k));
}

export function sectionHasContent(cv: CvData, key: SectionKey): boolean {
  switch (key) {
    case 'summary':
      return cv.summary.trim().length > 0;
    case 'experience':
      return cv.experience.some((e) => e.role.trim() || e.company.trim());
    case 'education':
      return cv.education.some((e) => e.degree.trim() || e.institution.trim());
    case 'skills':
      return cv.skills.some((g) => g.items.some((i) => i.trim()));
    case 'certifications':
      return cv.certifications.some((c) => c.name.trim());
    case 'projects':
      return cv.projects.some((p) => p.name.trim());
    case 'languages':
      return cv.languages.some((l) => l.name.trim());
  }
}

/** Nombre de archivo recomendado por los ATS: Nombre_Apellido_CV, sin tildes ni espacios. */
export function suggestedFileName(cv: CvData): string {
  const base = cv.personal.fullName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
  return `${base || 'Hoja_de_vida'}_CV`;
}
