/** Modelo de datos de una hoja de vida en Perfila. Vive solo en el navegador (localStorage). */

export type TemplateId = 'moderna' | 'tecnica' | 'elegante' | 'contraste' | 'clasica' | 'ejecutiva' | 'minimal';
/** Tipografía del documento. 'auto' usa la de la plantilla. Solo fuentes estáticas de sistema u Office. */
export type FontChoice = 'auto' | 'arial' | 'calibri' | 'aptos' | 'georgia' | 'cambria';
export type CvLang = 'es' | 'en';
export type Paper = 'letter' | 'a4';
export type DateStyle = 'short' | 'numeric';
export type FontScale = 'sm' | 'md' | 'lg';
export type WorkMode = '' | 'presencial' | 'hibrido' | 'remoto';
export type LanguageLevel = 'nativo' | 'C2' | 'C1' | 'B2' | 'B1' | 'A2' | 'A1';

export type SectionKey = 'summary' | 'experience' | 'education' | 'skills' | 'certifications' | 'projects' | 'languages';

export interface Personal {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedin: string;
  website: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  location: string;
  mode: WorkMode;
  /** 'YYYY-MM' o 'YYYY' */
  start: string;
  end: string;
  current: boolean;
  highlights: string[];
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  details: string;
}

export interface SkillGroup {
  id: string;
  name: string;
  items: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  tech: string;
  url: string;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: LanguageLevel;
}

export interface CvSettings {
  template: TemplateId;
  lang: CvLang;
  paper: Paper;
  dateStyle: DateStyle;
  fontScale: FontScale;
  font: FontChoice;
  /** Color de acento de la plantilla (solo títulos y reglas; nunca texto de cuerpo). */
  accent: string;
  /** Orden de las secciones. */
  order: SectionKey[];
  /** Secciones ocultas. */
  hidden: SectionKey[];
}

export interface CvData {
  schema: 1;
  personal: Personal;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: SkillGroup[];
  certifications: Certification[];
  projects: Project[];
  languages: LanguageItem[];
  settings: CvSettings;
}
