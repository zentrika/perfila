import {
  SECTION_TITLES,
  contactParts,
  displayUrl,
  formatLevel,
  formatMode,
  formatRange,
  formatYm,
  visibleSections,
} from './format';
import type { CvData, SectionKey } from './types';

/** Bloques neutros de la hoja de vida. Los usan la exportación a texto, la de DOCX y la revisión ATS. */
export type Block =
  | { kind: 'name'; text: string }
  | { kind: 'headline'; text: string }
  | { kind: 'contact'; text: string }
  | { kind: 'heading'; text: string; key: SectionKey }
  | { kind: 'entry'; title: string; date: string; sub: string }
  | { kind: 'bullet'; text: string; boldPrefix?: string }
  | { kind: 'para'; text: string; boldPrefix?: string };

export function toBlocks(cv: CvData): Block[] {
  const { lang, dateStyle } = cv.settings;
  const t = SECTION_TITLES[lang];
  const out: Block[] = [];
  out.push({ kind: 'name', text: cv.personal.fullName.trim() });
  if (cv.personal.headline.trim()) out.push({ kind: 'headline', text: cv.personal.headline.trim() });
  const contacts = contactParts(cv);
  if (contacts.length) out.push({ kind: 'contact', text: contacts.join(' | ') });

  for (const key of visibleSections(cv)) {
    out.push({ kind: 'heading', text: t[key], key });
    switch (key) {
      case 'summary':
        out.push({ kind: 'para', text: cv.summary.trim() });
        break;
      case 'experience':
        for (const e of cv.experience.filter((x) => x.role.trim() || x.company.trim())) {
          out.push({
            kind: 'entry',
            title: [e.role.trim(), e.company.trim()].filter(Boolean).join(' — '),
            date: formatRange(e.start, e.end, e.current, lang, dateStyle),
            sub: [e.location.trim(), formatMode(e.mode, lang)].filter(Boolean).join(' · '),
          });
          for (const h of e.highlights.map((x) => x.trim()).filter(Boolean)) out.push({ kind: 'bullet', text: h });
        }
        break;
      case 'education':
        for (const e of cv.education.filter((x) => x.degree.trim() || x.institution.trim())) {
          out.push({
            kind: 'entry',
            title: [e.degree.trim(), e.institution.trim()].filter(Boolean).join(' — '),
            date: formatRange(e.start, e.end, e.current, lang, dateStyle),
            sub: [e.location.trim(), e.details.trim()].filter(Boolean).join(' · '),
          });
        }
        break;
      case 'skills':
        for (const g of cv.skills.filter((x) => x.items.some((i) => i.trim()))) {
          out.push({
            kind: 'bullet',
            boldPrefix: g.name.trim() ? `${g.name.trim()}: ` : undefined,
            text: g.items.map((i) => i.trim()).filter(Boolean).join(', '),
          });
        }
        break;
      case 'certifications':
        for (const c of cv.certifications.filter((x) => x.name.trim())) {
          const rest = [c.issuer.trim(), formatYm(c.date, lang, dateStyle), displayUrl(c.url)].filter(Boolean).join(' · ');
          out.push({ kind: 'bullet', boldPrefix: c.name.trim(), text: rest ? ` — ${rest}` : '' });
        }
        break;
      case 'projects':
        for (const p of cv.projects.filter((x) => x.name.trim())) {
          const parts = [
            p.url.trim() ? ` · ${displayUrl(p.url)}` : '',
            p.description.trim() ? `: ${p.description.trim()}` : '',
            p.tech.trim() ? ` (${lang === 'es' ? 'Tecnologías' : 'Tech'}: ${p.tech.trim()})` : '',
          ].join('');
          out.push({ kind: 'para', boldPrefix: p.name.trim(), text: parts });
        }
        break;
      case 'languages':
        out.push({
          kind: 'para',
          text: cv.languages
            .filter((l) => l.name.trim())
            .map((l) => `${l.name.trim()}: ${formatLevel(l.level, lang)}`)
            .join(' · '),
        });
        break;
    }
  }
  return out;
}

/** Versión en texto plano: útil para pegar en formularios de portales de empleo. */
export function toPlainText(cv: CvData): string {
  const lines: string[] = [];
  for (const b of toBlocks(cv)) {
    switch (b.kind) {
      case 'name':
        lines.push(b.text.toUpperCase());
        break;
      case 'headline':
      case 'contact':
        lines.push(b.text);
        break;
      case 'heading':
        lines.push('', b.text.toUpperCase());
        break;
      case 'entry':
        lines.push(`${b.title}${b.date ? ` | ${b.date}` : ''}`);
        if (b.sub) lines.push(b.sub);
        break;
      case 'bullet':
        lines.push(`- ${b.boldPrefix ?? ''}${b.text}`);
        break;
      case 'para':
        lines.push(`${b.boldPrefix ?? ''}${b.text}`);
        break;
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
