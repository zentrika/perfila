'use client';

import type { ReactNode } from 'react';

import { Checkbox, Field, MonthYear, Repeater, Select, TagInput, TextArea, TextInput, Tip } from './Fields';

import Icon, { type IconName } from '@/components/Icon';
import ScaledSheet from '@/components/templates/ScaledSheet';
import { FONTS, TEMPLATES } from '@/components/templates/templates';
import { ACTION_STEMS, norm } from '@/lib/ats/lexicon';
import { ACCENTS, newCertification, newEducation, newExperience, newLanguage, newProject, newSkillGroup } from '@/lib/cv/defaults';
import { LEVEL_OPTIONS, SECTION_LABELS_UI, formatRange } from '@/lib/cv/format';
import type { CvData, SectionKey } from '@/lib/cv/types';

export type StepId = 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'extras' | 'languages' | 'design' | 'review';

export interface StepProps {
  cv: CvData;
  set: (fn: (cv: CvData) => CvData) => void;
}

export const STEPS: { id: StepId; title: string; short: string; icon: IconName; done: (cv: CvData) => boolean; optional?: boolean }[] = [
  { id: 'personal', title: 'Datos personales', short: 'Datos', icon: 'user', done: (cv) => !!(cv.personal.fullName.trim() && cv.personal.email.trim() && cv.personal.phone.trim()) },
  { id: 'summary', title: 'Perfil profesional', short: 'Perfil', icon: 'text', done: (cv) => cv.summary.trim().split(/\s+/).length >= 30 },
  { id: 'experience', title: 'Experiencia laboral', short: 'Experiencia', icon: 'briefcase', done: (cv) => cv.experience.some((e) => e.role.trim() && e.company.trim()) },
  { id: 'education', title: 'Educación', short: 'Educación', icon: 'school', done: (cv) => cv.education.some((e) => e.degree.trim() && e.institution.trim()) },
  { id: 'skills', title: 'Habilidades', short: 'Habilidades', icon: 'sparkles', done: (cv) => cv.skills.reduce((n, g) => n + g.items.length, 0) >= 5 },
  { id: 'extras', title: 'Certificaciones y proyectos', short: 'Extras', icon: 'award', done: (cv) => cv.certifications.some((c) => c.name.trim()) || cv.projects.some((p) => p.name.trim()), optional: true },
  { id: 'languages', title: 'Idiomas', short: 'Idiomas', icon: 'globe', done: (cv) => cv.languages.some((l) => l.name.trim()) },
  { id: 'design', title: 'Plantilla y diseño', short: 'Diseño', icon: 'palette', done: () => false },
  { id: 'review', title: 'Revisar y descargar', short: 'Descargar', icon: 'download', done: () => false },
];

function StepHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="step-head">
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </header>
  );
}

// ── 1. Datos personales ─────────────────────────────────────────────────

export function PersonalStep({ cv, set }: StepProps) {
  const p = cv.personal;
  const up = (k: keyof typeof p) => (v: string) => set((d) => ({ ...d, personal: { ...d.personal, [k]: v } }));
  return (
    <>
      <StepHead title="Datos personales">Lo primero que lee el reclutador. Todo va como texto en la parte superior, nunca en un encabezado de página.</StepHead>
      <div className="grid-2">
        <TextInput label="Nombre completo" value={p.fullName} onChange={up('fullName')} placeholder="Valentina Ríos Mejía" autoComplete="name" wide />
        <TextInput
          label="Título profesional"
          value={p.headline}
          onChange={up('headline')}
          placeholder="Analista de Datos · SQL · Python · Power BI"
          hint="Usa el nombre del cargo al que aplicas y 2 o 3 habilidades clave."
          wide
          maxLength={160}
        />
        <TextInput label="Correo electrónico" type="email" value={p.email} onChange={up('email')} placeholder="nombre.apellido@correo.com" autoComplete="email" />
        <TextInput label="Teléfono" type="tel" value={p.phone} onChange={up('phone')} placeholder="+57 300 123 4567" autoComplete="tel" />
        <TextInput label="Ciudad" value={p.city} onChange={up('city')} placeholder="Medellín" autoComplete="address-level2" />
        <TextInput label="País" value={p.country} onChange={up('country')} placeholder="Colombia" autoComplete="country-name" />
        <TextInput label="LinkedIn" value={p.linkedin} onChange={up('linkedin')} placeholder="linkedin.com/in/tu-usuario" hint="Escribe la dirección completa: el ATS lee el texto, no el enlace." />
        <TextInput label="Portafolio, GitHub o sitio web" value={p.website} onChange={up('website')} placeholder="github.com/tu-usuario" />
      </div>
      <Tip>
        No incluyas foto, número de cédula, fecha de nacimiento, estado civil ni dirección completa. No los piden los ATS, se prestan para discriminación y exponen tus datos.
        Basta con ciudad y país.
      </Tip>
    </>
  );
}

// ── 2. Perfil ───────────────────────────────────────────────────────────

export function SummaryStep({ cv, set }: StepProps) {
  const words = cv.summary.trim() ? cv.summary.trim().split(/\s+/).length : 0;
  const tone = words === 0 ? '' : words < 30 ? 'warn' : words > 110 ? 'warn' : 'ok';
  return (
    <>
      <StepHead title="Perfil profesional">Tres o cuatro frases que respondan: qué haces, en qué eres fuerte y qué buscas aportar.</StepHead>
      <TextArea
        label="Resumen"
        value={cv.summary}
        onChange={(v) => set((d) => ({ ...d, summary: v }))}
        rows={7}
        placeholder="Analista de datos con 4 años de experiencia convirtiendo datos de ventas en decisiones. Construyo modelos en SQL y Python y tableros en Power BI…"
        counter={<span className={`counter ${tone}`}>{words} palabras · ideal 40–90</span>}
      />
      <Tip>
        Incluye tu cargo, años de experiencia y las 3 a 5 habilidades que más pide la oferta, con las mismas palabras del aviso. Escribe en estilo directo, sin «yo» y sin
        adjetivos vacíos como «proactivo» o «apasionado».
      </Tip>
    </>
  );
}

// ── 3. Experiencia ──────────────────────────────────────────────────────

function BulletHints({ text }: { text: string }) {
  const t = text.trim();
  if (!t) return null;
  const first = norm(t).split(/[^a-z]+/).filter(Boolean)[0] ?? '';
  const verb = first.length >= 3 && ACTION_STEMS.some((s) => first.startsWith(s));
  const num = /\d/.test(t.replace(/\b(19|20)\d{2}\b/g, ''));
  const long = t.length > 220;
  return (
    <span className="bullet-hints">
      <span className={verb ? 'ok' : 'off'}>{verb ? <Icon name="check" size={12} /> : null}Verbo de acción</span>
      <span className={num ? 'ok' : 'off'}>{num ? <Icon name="check" size={12} /> : null}Cifra</span>
      {long && <span className="warn">Muy larga</span>}
    </span>
  );
}

function BulletList({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const list = items.length ? items : [''];
  return (
    <Field label="Logros y responsabilidades" wide hint="Una idea por viñeta: verbo de acción + qué hiciste + resultado medible.">
      <ol className="bullets-edit">
        {list.map((b, i) => (
          <li key={i}>
            <div className="bullet-row">
              <span className="bullet-dot" aria-hidden="true">•</span>
              <textarea
                className="input textarea bullet-input"
                rows={2}
                value={b}
                maxLength={400}
                aria-label={`Logro ${i + 1}`}
                placeholder={i === 0 ? 'Automaticé el reporte semanal de ventas con Python y reduje su preparación de 6 horas a 20 minutos.' : 'Otro logro…'}
                onChange={(e) => onChange(list.map((x, k) => (k === i ? e.target.value.replace(/\n/g, ' ') : x)))}
              />
              <div className="bullet-actions">
                <button type="button" className="icon-btn sm" aria-label="Subir" disabled={i === 0} onClick={() => onChange(swap(list, i, i - 1))}>
                  <Icon name="up" size={15} />
                </button>
                <button type="button" className="icon-btn sm" aria-label="Bajar" disabled={i === list.length - 1} onClick={() => onChange(swap(list, i, i + 1))}>
                  <Icon name="down" size={15} />
                </button>
                <button type="button" className="icon-btn sm" aria-label="Quitar" onClick={() => onChange(list.filter((_, k) => k !== i))}>
                  <Icon name="x" size={15} />
                </button>
              </div>
            </div>
            <BulletHints text={b} />
          </li>
        ))}
      </ol>
      {list.length < 10 && (
        <button type="button" className="btn-link" onClick={() => onChange([...list, ''])}>
          <Icon name="plus" size={14} /> Agregar logro
        </button>
      )}
    </Field>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function ExperienceStep({ cv, set }: StepProps) {
  return (
    <>
      <StepHead title="Experiencia laboral">Del cargo más reciente al más antiguo. Concéntrate en los últimos 10 años y en lo relacionado con la oferta.</StepHead>
      <Repeater
        items={cv.experience}
        onChange={(experience) => set((d) => ({ ...d, experience }))}
        create={newExperience}
        titleOf={(e) => [e.role, e.company].filter((x) => x.trim()).join(' — ')}
        subtitleOf={(e) => formatRange(e.start, e.end, e.current, 'es', 'short')}
        addLabel="Agregar experiencia"
        empty="Aún no has agregado experiencia. Si estás empezando, incluye prácticas, voluntariados o proyectos relevantes."
        render={(e, up) => (
          <div className="grid-2">
            <TextInput label="Cargo" value={e.role} onChange={(v) => up({ role: v })} placeholder="Analista de Datos" />
            <TextInput label="Empresa" value={e.company} onChange={(v) => up({ company: v })} placeholder="Comercializadora Andina S.A.S." />
            <TextInput label="Ciudad" value={e.location} onChange={(v) => up({ location: v })} placeholder="Medellín, Colombia" />
            <Select
              label="Modalidad"
              value={e.mode}
              onChange={(v) => up({ mode: v })}
              options={[
                { value: '', label: 'Sin especificar' },
                { value: 'presencial', label: 'Presencial' },
                { value: 'hibrido', label: 'Híbrido' },
                { value: 'remoto', label: 'Remoto' },
              ]}
            />
            <MonthYear label="Inicio" value={e.start} onChange={(v) => up({ start: v })} />
            <div>
              <MonthYear label="Fin" value={e.end} onChange={(v) => up({ end: v })} disabled={e.current} />
              <Checkbox label="Trabajo aquí actualmente" checked={e.current} onChange={(v) => up({ current: v })} />
            </div>
            <BulletList items={e.highlights} onChange={(highlights) => up({ highlights })} />
          </div>
        )}
      />
      <Tip>
        Escribe logros, no funciones. En lugar de «Responsable del reporte de ventas», escribe «Automaticé el reporte de ventas y reduje su preparación de 6 horas a 20
        minutos». Usa cifras reales que puedas explicar en una entrevista.
      </Tip>
    </>
  );
}

// ── 4. Educación ────────────────────────────────────────────────────────

export function EducationStep({ cv, set }: StepProps) {
  return (
    <>
      <StepHead title="Educación">Títulos obtenidos o en curso, del más reciente al más antiguo.</StepHead>
      <Repeater
        items={cv.education}
        onChange={(education) => set((d) => ({ ...d, education }))}
        create={newEducation}
        titleOf={(e) => [e.degree, e.institution].filter((x) => x.trim()).join(' — ')}
        subtitleOf={(e) => formatRange(e.start, e.end, e.current, 'es', 'short')}
        addLabel="Agregar estudio"
        empty="Agrega tu formación: pregrado, especialización, maestría, técnico o tecnólogo."
        render={(e, up) => (
          <div className="grid-2">
            <TextInput label="Título" value={e.degree} onChange={(v) => up({ degree: v })} placeholder="Ingeniería Industrial" />
            <TextInput label="Institución" value={e.institution} onChange={(v) => up({ institution: v })} placeholder="Universidad de Antioquia" />
            <TextInput label="Ciudad" value={e.location} onChange={(v) => up({ location: v })} placeholder="Medellín" />
            <TextInput label="Detalle (opcional)" value={e.details} onChange={(v) => up({ details: v })} placeholder="Tesis meritoria · Promedio 4,5/5,0" maxLength={160} />
            <MonthYear label="Inicio" value={e.start} onChange={(v) => up({ start: v })} />
            <div>
              <MonthYear label="Fin (o fecha prevista)" value={e.end} onChange={(v) => up({ end: v })} disabled={e.current} />
              <Checkbox label="En curso" checked={e.current} onChange={(v) => up({ current: v })} />
            </div>
          </div>
        )}
      />
      <Tip>Usa las fechas de tus diplomas. Si cambian entre tu CV y LinkedIn, el reclutador lo nota.</Tip>
    </>
  );
}

// ── 5. Habilidades ──────────────────────────────────────────────────────

const GROUP_SUGGESTIONS = ['Lenguajes', 'Herramientas', 'Frameworks', 'Bases de datos', 'Software', 'Metodologías', 'Habilidades blandas'];

export function SkillsStep({ cv, set }: StepProps) {
  return (
    <>
      <StepHead title="Habilidades">Agrupa tus habilidades por tema. Son las palabras clave que el ATS compara con la oferta.</StepHead>
      <Repeater
        items={cv.skills}
        onChange={(skills) => set((d) => ({ ...d, skills }))}
        create={() => newSkillGroup(GROUP_SUGGESTIONS[cv.skills.length] ?? '')}
        titleOf={(g) => g.name}
        subtitleOf={(g) => (g.items.length ? `${g.items.length} habilidades` : '')}
        addLabel="Agregar grupo"
        empty="Crea un grupo, por ejemplo «Lenguajes» o «Herramientas», y agrega tus habilidades."
        render={(g, up) => (
          <div className="grid-2">
            <TextInput label="Nombre del grupo" value={g.name} onChange={(v) => up({ name: v })} placeholder="Herramientas" wide maxLength={60} />
            <TagInput label="Habilidades" items={g.items} onChange={(items) => up({ items })} placeholder="SQL, Excel avanzado, Power BI…" />
          </div>
        )}
      />
      <Tip>
        Escribe cada herramienta como aparece en las ofertas («Power BI», «Excel avanzado», «Scrum»). Evita barras, estrellas o porcentajes de dominio: el ATS no los lee y el
        reclutador no sabe qué significan.
      </Tip>
    </>
  );
}

// ── 6. Certificaciones y proyectos ──────────────────────────────────────

export function ExtrasStep({ cv, set }: StepProps) {
  return (
    <>
      <StepHead title="Certificaciones y proyectos">Opcional, pero suma: demuestra aprendizaje continuo y trabajo propio.</StepHead>
      <h2 className="sub-h">Certificaciones y cursos</h2>
      <Repeater
        items={cv.certifications}
        onChange={(certifications) => set((d) => ({ ...d, certifications }))}
        create={newCertification}
        titleOf={(c) => c.name}
        subtitleOf={(c) => c.issuer}
        addLabel="Agregar certificación"
        empty="Sin certificaciones por ahora."
        render={(c, up) => (
          <div className="grid-2">
            <TextInput label="Nombre" value={c.name} onChange={(v) => up({ name: v })} placeholder="Power BI Data Analyst Associate" wide />
            <TextInput label="Entidad" value={c.issuer} onChange={(v) => up({ issuer: v })} placeholder="Microsoft" />
            <MonthYear label="Fecha" value={c.date} onChange={(v) => up({ date: v })} />
            <TextInput label="Enlace de verificación (opcional)" value={c.url} onChange={(v) => up({ url: v })} placeholder="credly.com/…" wide />
          </div>
        )}
      />
      <h2 className="sub-h">Proyectos</h2>
      <Repeater
        items={cv.projects}
        onChange={(projects) => set((d) => ({ ...d, projects }))}
        create={newProject}
        titleOf={(p) => p.name}
        subtitleOf={(p) => p.tech}
        addLabel="Agregar proyecto"
        empty="Sin proyectos por ahora."
        render={(p, up) => (
          <div className="grid-2">
            <TextInput label="Nombre" value={p.name} onChange={(v) => up({ name: v })} placeholder="Tablero de movilidad de Medellín" />
            <TextInput label="Enlace (opcional)" value={p.url} onChange={(v) => up({ url: v })} placeholder="github.com/…" />
            <TextArea label="Descripción" value={p.description} onChange={(v) => up({ description: v.replace(/\n/g, ' ') })} rows={2} maxLength={600} placeholder="Qué problema resuelve y cuál fue el resultado." />
            <TextInput label="Tecnologías" value={p.tech} onChange={(v) => up({ tech: v })} placeholder="Python, Pandas, Power BI" wide maxLength={300} />
          </div>
        )}
      />
    </>
  );
}

// ── 7. Idiomas ──────────────────────────────────────────────────────────

export function LanguagesStep({ cv, set }: StepProps) {
  return (
    <>
      <StepHead title="Idiomas">Indica el nivel con el Marco Común Europeo (A1 a C2): es lo que entienden los reclutadores y los ATS.</StepHead>
      <Repeater
        items={cv.languages}
        onChange={(languages) => set((d) => ({ ...d, languages }))}
        create={newLanguage}
        titleOf={(l) => l.name}
        subtitleOf={(l) => LEVEL_OPTIONS.find((o) => o.value === l.level)?.label ?? ''}
        addLabel="Agregar idioma"
        empty="Agrega al menos tu idioma nativo."
        render={(l, up) => (
          <div className="grid-2">
            <TextInput label="Idioma" value={l.name} onChange={(v) => up({ name: v })} placeholder="Inglés" maxLength={60} />
            <Select label="Nivel" value={l.level} onChange={(v) => up({ level: v })} options={LEVEL_OPTIONS} />
          </div>
        )}
      />
      <Tip>Si tienes un certificado (EF SET, IELTS, TOEFL, DELE), agrégalo en Certificaciones: respalda el nivel que declaras.</Tip>
    </>
  );
}

// ── 8. Diseño ───────────────────────────────────────────────────────────

export function DesignStep({ cv, set }: StepProps) {
  const s = cv.settings;
  const up = (patch: Partial<typeof s>) => set((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const current = TEMPLATES.find((t) => t.id === s.template);
  const moveSection = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= s.order.length) return;
    up({ order: swap(s.order, i, j) });
  };
  const toggle = (k: SectionKey) => up({ hidden: s.hidden.includes(k) ? s.hidden.filter((x) => x !== k) : [...s.hidden, k] });

  return (
    <>
      <StepHead title="Plantilla y diseño">Las cuatro plantillas cumplen las normas ATS. Elige la que mejor encaje con tu sector.</StepHead>
      <div className="template-grid" role="radiogroup" aria-label="Plantilla">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={s.template === t.id} className={`template-card${s.template === t.id ? ' is-active' : ''}`} onClick={() => up({ template: t.id })}>
            <span className="template-thumb" aria-hidden="true">
              <ScaledSheet cv={{ ...cv, settings: { ...s, template: t.id } }} />
            </span>
            <span className="template-meta">
              <strong>{t.name}</strong>
              <span className="muted">{t.description}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid-2 design-controls">
        <Field label="Color de acento" hint={current?.usesAccent ? 'Solo en títulos y líneas; el texto siempre va en negro.' : 'Esta plantilla es monocromática.'}>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                className={`swatch${s.accent === a.value ? ' is-active' : ''}`}
                style={{ background: a.value }}
                aria-label={a.label}
                aria-pressed={s.accent === a.value}
                disabled={!current?.usesAccent}
                onClick={() => up({ accent: a.value })}
              />
            ))}
          </div>
        </Field>
        <Select
          label="Idioma de los títulos"
          value={s.lang}
          onChange={(v) => up({ lang: v })}
          options={[
            { value: 'es', label: 'Español (Experiencia laboral…)' },
            { value: 'en', label: 'Inglés (Work Experience…)' },
          ]}
          hint="Cambia títulos, meses y niveles. Tu contenido no se traduce."
        />
        <Select
          label="Tamaño de papel"
          value={s.paper}
          onChange={(v) => up({ paper: v })}
          options={[
            { value: 'letter', label: 'Carta (Colombia, EE. UU.)' },
            { value: 'a4', label: 'A4 (Europa y otros)' },
          ]}
        />
        <Select
          label="Formato de fechas"
          value={s.dateStyle}
          onChange={(v) => up({ dateStyle: v })}
          options={[
            { value: 'short', label: s.lang === 'es' ? 'sept. 2022 – Actualidad' : 'Sep 2022 – Present' },
            { value: 'numeric', label: s.lang === 'es' ? '09/2022 – Actualidad' : '09/2022 – Present' },
          ]}
        />
        <Select
          label="Tipografía"
          value={s.font}
          onChange={(v) => up({ font: v })}
          options={FONTS.map((f) => ({ value: f.value, label: f.value === 'auto' ? `La de la plantilla (${current?.font ?? 'Arial'})` : f.label }))}
          hint={
            s.font === 'calibri' || s.font === 'aptos' || s.font === 'cambria'
              ? 'Viene con Microsoft Office. Si tu equipo no la tiene, el PDF sale en Arial (el Word sí la usa).'
              : 'Para tecnología, una sans serif (Arial, Calibri o Aptos) se ve más actual.'
          }
        />
        <Select
          label="Tamaño de letra"
          value={s.fontScale}
          onChange={(v) => up({ fontScale: v })}
          options={[
            { value: 'sm', label: 'Compacto' },
            { value: 'md', label: 'Normal' },
            { value: 'lg', label: 'Grande' },
          ]}
        />
      </div>

      <Field label="Orden y visibilidad de las secciones" wide hint="Si tienes poca experiencia, sube Educación o Proyectos. Las secciones vacías no se muestran.">
        <ol className="section-order">
          {s.order.map((k, i) => (
            <li key={k} className={s.hidden.includes(k) ? 'is-hidden' : ''}>
              <span>{SECTION_LABELS_UI[k]}</span>
              <div className="rep-actions">
                <button type="button" className="icon-btn sm" aria-label={`Subir ${SECTION_LABELS_UI[k]}`} disabled={i === 0} onClick={() => moveSection(i, -1)}>
                  <Icon name="up" size={15} />
                </button>
                <button type="button" className="icon-btn sm" aria-label={`Bajar ${SECTION_LABELS_UI[k]}`} disabled={i === s.order.length - 1} onClick={() => moveSection(i, 1)}>
                  <Icon name="down" size={15} />
                </button>
                <button type="button" className="icon-btn sm" aria-label={s.hidden.includes(k) ? `Mostrar ${SECTION_LABELS_UI[k]}` : `Ocultar ${SECTION_LABELS_UI[k]}`} aria-pressed={!s.hidden.includes(k)} onClick={() => toggle(k)}>
                  <Icon name={s.hidden.includes(k) ? 'x' : 'eye'} size={15} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </Field>
    </>
  );
}
