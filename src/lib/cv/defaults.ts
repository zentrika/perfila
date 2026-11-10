import type {
  Certification,
  CvData,
  CvSettings,
  Education,
  Experience,
  LanguageItem,
  Project,
  SectionKey,
  SkillGroup,
} from './types';

export const SECTION_KEYS: SectionKey[] = ['summary', 'experience', 'education', 'skills', 'certifications', 'projects', 'languages'];

export const ACCENTS = [
  { value: '#1f2937', label: 'Grafito' },
  { value: '#1d4ed8', label: 'Azul' },
  { value: '#4338ca', label: 'Índigo' },
  { value: '#0f766e', label: 'Verde petróleo' },
  { value: '#9f1239', label: 'Vino' },
];

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export const defaultSettings = (): CvSettings => ({
  template: 'moderna',
  lang: 'es',
  paper: 'letter',
  dateStyle: 'short',
  fontScale: 'md',
  font: 'auto',
  accent: ACCENTS[1].value,
  order: [...SECTION_KEYS],
  hidden: [],
});

export const emptyCv = (): CvData => ({
  schema: 1,
  personal: { fullName: '', headline: '', email: '', phone: '', city: '', country: '', linkedin: '', website: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
  settings: defaultSettings(),
});

export const newExperience = (): Experience => ({
  id: uid(),
  role: '',
  company: '',
  location: '',
  mode: '',
  start: '',
  end: '',
  current: false,
  highlights: [''],
});

export const newEducation = (): Education => ({
  id: uid(),
  degree: '',
  institution: '',
  location: '',
  start: '',
  end: '',
  current: false,
  details: '',
});

export const newSkillGroup = (name = ''): SkillGroup => ({ id: uid(), name, items: [] });
export const newCertification = (): Certification => ({ id: uid(), name: '', issuer: '', date: '', url: '' });
export const newProject = (): Project => ({ id: uid(), name: '', description: '', tech: '', url: '' });
export const newLanguage = (): LanguageItem => ({ id: uid(), name: '', level: 'B2' });

const str = (v: unknown, max = 4000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const bool = (v: unknown): boolean => v === true;
const arr = <T>(v: unknown, map: (x: Record<string, unknown>) => T, max = 40): T[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').slice(0, max).map((x) => map(x as Record<string, unknown>)) : [];
const strArr = (v: unknown, max = 40): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, max).map((x) => str(x, 600)) : []);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);

/**
 * Normaliza datos de origen desconocido (localStorage de otra versión o un JSON importado).
 * Nunca confía en la forma: cada campo se valida y se recorta.
 */
export function sanitizeCv(input: unknown): CvData {
  const base = emptyCv();
  if (!input || typeof input !== 'object') return base;
  const d = input as Record<string, unknown>;
  const p = (d.personal ?? {}) as Record<string, unknown>;
  const s = (d.settings ?? {}) as Record<string, unknown>;
  const order = Array.isArray(s.order) ? (s.order.filter((k) => SECTION_KEYS.includes(k as SectionKey)) as SectionKey[]) : [];
  for (const k of SECTION_KEYS) if (!order.includes(k)) order.push(k);

  return {
    schema: 1,
    personal: {
      fullName: str(p.fullName, 120),
      headline: str(p.headline, 160),
      email: str(p.email, 160),
      phone: str(p.phone, 60),
      city: str(p.city, 80),
      country: str(p.country, 80),
      linkedin: str(p.linkedin, 200),
      website: str(p.website, 200),
    },
    summary: str(d.summary, 2000),
    experience: arr(d.experience, (x) => ({
      id: str(x.id, 20) || uid(),
      role: str(x.role, 160),
      company: str(x.company, 160),
      location: str(x.location, 120),
      mode: oneOf(x.mode, ['', 'presencial', 'hibrido', 'remoto'] as const, ''),
      start: str(x.start, 7),
      end: str(x.end, 7),
      current: bool(x.current),
      highlights: strArr(x.highlights, 15),
    })),
    education: arr(d.education, (x) => ({
      id: str(x.id, 20) || uid(),
      degree: str(x.degree, 200),
      institution: str(x.institution, 200),
      location: str(x.location, 120),
      start: str(x.start, 7),
      end: str(x.end, 7),
      current: bool(x.current),
      details: str(x.details, 400),
    })),
    skills: arr(d.skills, (x) => ({ id: str(x.id, 20) || uid(), name: str(x.name, 80), items: strArr(x.items, 40) })),
    certifications: arr(d.certifications, (x) => ({
      id: str(x.id, 20) || uid(),
      name: str(x.name, 200),
      issuer: str(x.issuer, 160),
      date: str(x.date, 7),
      url: str(x.url, 300),
    })),
    projects: arr(d.projects, (x) => ({
      id: str(x.id, 20) || uid(),
      name: str(x.name, 160),
      description: str(x.description, 600),
      tech: str(x.tech, 300),
      url: str(x.url, 300),
    })),
    languages: arr(d.languages, (x) => ({
      id: str(x.id, 20) || uid(),
      name: str(x.name, 60),
      level: oneOf(x.level, ['nativo', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1'] as const, 'B2'),
    })),
    settings: {
      template: oneOf(s.template, ['moderna', 'tecnica', 'elegante', 'contraste', 'clasica', 'ejecutiva', 'minimal'] as const, base.settings.template),
      lang: oneOf(s.lang, ['es', 'en'] as const, 'es'),
      paper: oneOf(s.paper, ['letter', 'a4'] as const, 'letter'),
      dateStyle: oneOf(s.dateStyle, ['short', 'numeric'] as const, 'short'),
      fontScale: oneOf(s.fontScale, ['sm', 'md', 'lg'] as const, 'md'),
      font: oneOf(s.font, ['auto', 'arial', 'calibri', 'aptos', 'georgia', 'cambria'] as const, 'auto'),
      accent: oneOf(s.accent, ACCENTS.map((a) => a.value), base.settings.accent),
      order,
      hidden: Array.isArray(s.hidden) ? (s.hidden.filter((k) => SECTION_KEYS.includes(k as SectionKey)) as SectionKey[]) : [],
    },
  };
}
