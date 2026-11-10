import type { CSSProperties, ReactNode } from 'react';

import {
  SECTION_TITLES,
  contactParts,
  displayUrl,
  formatLevel,
  formatMode,
  formatRange,
  formatYm,
  hrefFor,
  visibleSections,
} from '@/lib/cv/format';
import type { CvData, SectionKey } from '@/lib/cv/types';

import { templateMeta } from './templates';

/**
 * Documento de la hoja de vida. Las cuatro plantillas comparten este HTML semántico y solo cambian
 * por CSS (`.cv-t-<plantilla>`). Así todas cumplen las mismas reglas ATS:
 * una sola columna, texto real, títulos estándar, sin tablas, imágenes, íconos ni cuadros de texto,
 * y el orden de lectura del DOM es el orden visual.
 */
export default function CvDocument({ cv, id }: { cv: CvData; id?: string }) {
  const { settings: s, personal: p } = cv;
  const t = SECTION_TITLES[s.lang];
  const contacts = contactParts(cv);
  const style = { '--cv-accent': s.accent } as CSSProperties;
  const sections = visibleSections(cv);
  const meta = templateMeta(s.template);
  const name = p.fullName.trim() || (s.lang === 'es' ? 'Tu nombre' : 'Your name');
  const [first, last] = splitName(name);

  return (
    <article
      id={id}
      className={`cv-sheet cv-t-${s.template} cv-fs-${s.fontScale} cv-paper-${s.paper} cv-font-${s.font}`}
      style={style}
      lang={s.lang === 'es' ? 'es' : 'en'}
    >
      <header className="cv-header">
        {/* Nombre y apellidos en piezas separadas para poder darles pesos distintos; el texto sigue siendo «Nombre Apellido». */}
        <h1 className="cv-name">
          {last ? (
            <>
              <span className="cv-name-first">{first}</span> <span className="cv-name-last">{last}</span>
            </>
          ) : (
            name
          )}
        </h1>
        {p.headline.trim() && <p className="cv-headline">{p.headline.trim()}</p>}
        {contacts.length > 0 && (
          <p className="cv-contact">
            {contacts.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="cv-sep">{meta.sep}</span>}
                {c}
              </span>
            ))}
          </p>
        )}
      </header>

      {sections.map((key) => (
        <Section key={key} title={t[key]} k={key}>
          {renderSection(cv, key, meta.bullet)}
        </Section>
      ))}
    </article>
  );
}

/**
 * Viñeta como carácter real («•»): las viñetas automáticas de las listas se dibujan como formas en
 * el PDF y el ATS no las ve, y muchos usan la viñeta para separar logros.
 */
function Bullet({ char }: { char: string }) {
  return <span className="cv-bullet">{char} </span>;
}

/** «Valentina Ríos Mejía» → [«Valentina», «Ríos Mejía»]: en español los dos últimos son apellidos. */
function splitName(full: string): [string, string] {
  const w = full.split(/\s+/).filter(Boolean);
  if (w.length < 2) return [full, ''];
  const n = w.length >= 3 ? 2 : 1;
  return [w.slice(0, -n).join(' '), w.slice(-n).join(' ')];
}

function Section({ title, k, children }: { title: string; k: SectionKey; children: ReactNode }) {
  return (
    <section className={`cv-section cv-s-${k}`}>
      <h2 className="cv-h2">{title}</h2>
      {children}
    </section>
  );
}

function Line({ left, right, sub }: { left: ReactNode; right?: string; sub?: ReactNode }) {
  return (
    <>
      <div className="cv-line">
        <h3 className="cv-h3">{left}</h3>
        {right && <span className="cv-date">{right}</span>}
      </div>
      {sub && <p className="cv-sub">{sub}</p>}
    </>
  );
}

function renderSection(cv: CvData, key: SectionKey, bullet: string): ReactNode {
  const { lang, dateStyle } = cv.settings;
  switch (key) {
    case 'summary':
      return <p className="cv-p">{cv.summary.trim()}</p>;

    case 'experience':
      return cv.experience
        .filter((e) => e.role.trim() || e.company.trim())
        .map((e) => {
          const meta = [e.location.trim(), formatMode(e.mode, lang)].filter(Boolean).join(' · ');
          const bullets = e.highlights.map((h) => h.trim()).filter(Boolean);
          return (
            <div className="cv-entry" key={e.id}>
              <Line
                left={
                  <>
                    <span className="cv-role">{e.role.trim()}</span>
                    {e.role.trim() && e.company.trim() && <span className="cv-dash"> — </span>}
                    <span className="cv-org">{e.company.trim()}</span>
                  </>
                }
                right={formatRange(e.start, e.end, e.current, lang, dateStyle)}
                sub={meta || undefined}
              />
              {bullets.length > 0 && (
                <ul className="cv-ul">
                  {bullets.map((b, i) => (
                    <li key={i}>
                      <Bullet char={bullet} />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        });

    case 'education':
      return cv.education
        .filter((e) => e.degree.trim() || e.institution.trim())
        .map((e) => (
          <div className="cv-entry" key={e.id}>
            <Line
              left={
                <>
                  <span className="cv-role">{e.degree.trim()}</span>
                  {e.degree.trim() && e.institution.trim() && <span className="cv-dash"> — </span>}
                  <span className="cv-org">{e.institution.trim()}</span>
                </>
              }
              right={formatRange(e.start, e.end, e.current, lang, dateStyle)}
              sub={[e.location.trim(), e.details.trim()].filter(Boolean).join(' · ') || undefined}
            />
          </div>
        ));

    case 'skills':
      return (
        <ul className="cv-ul cv-skills">
          {cv.skills
            .filter((g) => g.items.some((i) => i.trim()))
            .map((g) => (
              <li key={g.id}>
                <Bullet char={bullet} />
                {g.name.trim() && <strong>{g.name.trim()}: </strong>}
                {g.items.map((i) => i.trim()).filter(Boolean).join(', ')}
              </li>
            ))}
        </ul>
      );

    case 'certifications':
      return (
        <ul className="cv-ul cv-compact">
          {cv.certifications
            .filter((c) => c.name.trim())
            .map((c) => (
              <li key={c.id}>
                <Bullet char={bullet} />
                <strong>{c.name.trim()}</strong>
                {c.issuer.trim() && ` — ${c.issuer.trim()}`}
                {formatYm(c.date, lang, dateStyle) && ` · ${formatYm(c.date, lang, dateStyle)}`}
                {c.url.trim() && (
                  <>
                    {' · '}
                    <a href={hrefFor(c.url)}>{displayUrl(c.url)}</a>
                  </>
                )}
              </li>
            ))}
        </ul>
      );

    case 'projects':
      return cv.projects
        .filter((pr) => pr.name.trim())
        .map((pr) => (
          <div className="cv-entry" key={pr.id}>
            <p className="cv-p">
              <strong>{pr.name.trim()}</strong>
              {pr.url.trim() && (
                <>
                  {' · '}
                  <a href={hrefFor(pr.url)}>{displayUrl(pr.url)}</a>
                </>
              )}
              {pr.description.trim() && `: ${pr.description.trim()}`}
              {pr.tech.trim() && (
                <>
                  {' '}
                  <span className="cv-tech">
                    ({lang === 'es' ? 'Tecnologías' : 'Tech'}: {pr.tech.trim()})
                  </span>
                </>
              )}
            </p>
          </div>
        ));

    case 'languages':
      return (
        <p className="cv-p">
          {cv.languages
            .filter((l) => l.name.trim())
            .map((l) => `${l.name.trim()}: ${formatLevel(l.level, lang)}`)
            .join(' · ')}
        </p>
      );
  }
}
