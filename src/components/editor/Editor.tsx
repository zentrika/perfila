'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';

import { ConfirmButton } from './Fields';
import Preview from './Preview';
import ReviewStep from './ReviewStep';
import {
  DesignStep,
  EducationStep,
  ExperienceStep,
  ExtrasStep,
  LanguagesStep,
  PersonalStep,
  STEPS,
  SkillsStep,
  SummaryStep,
  type StepId,
  type StepProps,
} from './Steps';

import Icon from '@/components/Icon';
import CvDocument from '@/components/templates/CvDocument';
import { emptyCv, sanitizeCv } from '@/lib/cv/defaults';
import { suggestedFileName } from '@/lib/cv/format';
import { sampleCv } from '@/lib/cv/sample';
import type { CvData } from '@/lib/cv/types';
import { downloadBlob } from '@/lib/download';
import { STORAGE_KEYS, readJson, timeAgo, usePersistentState, writeJson } from '@/lib/storage';

const isEmpty = (cv: CvData) =>
  !cv.personal.fullName && !cv.summary && !cv.experience.length && !cv.education.length && !cv.skills.length && !cv.languages.length;

export default function Editor() {
  const { state: cv, setState: setCv, hydrated, status, savedAt, flush } = usePersistentState<CvData>(STORAGE_KEYS.cv, emptyCv, sanitizeCv);
  const [step, setStep] = useState<StepId>('personal');
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [mounted, setMounted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [, tick] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const formTop = useRef<HTMLDivElement>(null);

  // Paso actual: también sobrevive a recargas.
  useEffect(() => {
    setMounted(true);
    const s = readJson(STORAGE_KEYS.editorStep);
    if (typeof s === 'string' && STEPS.some((x) => x.id === s)) setStep(s as StepId);
  }, []);
  useEffect(() => {
    if (mounted) writeJson(STORAGE_KEYS.editorStep, step);
  }, [step, mounted]);
  // Refresca el «guardado hace…» cada 30 s.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const set: StepProps['set'] = useCallback((fn) => setCv((prev) => fn(prev)), [setCv]);

  const go = (id: StepId) => {
    setStep(id);
    setMobileView('form');
    // Vuelve al inicio del formulario solo si quedó fuera de vista (debajo de la barra fija).
    const top = formTop.current?.getBoundingClientRect().top ?? 0;
    if (top < 120) window.scrollTo({ top: Math.max(0, window.scrollY + top - 140), behavior: 'smooth' });
  };
  const index = STEPS.findIndex((s) => s.id === step);
  const prev = STEPS[index - 1];
  const next = STEPS[index + 1];

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const print = () => {
    flush();
    const prevTitle = document.title;
    document.title = suggestedFileName(cv);
    let style = document.getElementById('cv-page-style') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'cv-page-style';
      document.head.appendChild(style);
    }
    style.textContent = `@page { size: ${cv.settings.paper === 'letter' ? 'letter' : 'A4'}; margin: 13mm 15mm; }`;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
    setTimeout(restore, 1500);
  };

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('too big');
      const data = sanitizeCv(JSON.parse(await file.text()));
      setCv(data);
      flash('Respaldo importado.');
    } catch {
      flash('No pude leer ese archivo. Debe ser un respaldo .json exportado desde Perfila.');
    }
  };

  const stepProps: StepProps = { cv, set };
  const doneCount = STEPS.filter((s) => s.done(cv)).length;
  const required = STEPS.filter((s) => s.id !== 'design' && s.id !== 'review' && !s.optional).length;

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <div className="editor-toolbar-inner">
          <div className="save-status" aria-live="polite">
            {!hydrated ? (
              <span className="muted">Cargando…</span>
            ) : status === 'error' ? (
              <span className="danger-text">
                <Icon name="alert" size={15} /> No se pudo guardar en este navegador (almacenamiento lleno o bloqueado). Exporta un respaldo.
              </span>
            ) : status === 'saving' ? (
              <span className="muted">Guardando…</span>
            ) : savedAt ? (
              <span className="muted">
                <Icon name="check" size={15} /> Guardado en este navegador {timeAgo(savedAt)}
              </span>
            ) : (
              <span className="muted">
                <Icon name="lock" size={15} /> Se guarda automáticamente en este navegador
              </span>
            )}
          </div>
          <div className="toolbar-actions">
            {hydrated && isEmpty(cv) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setCv(sampleCv());
                  flash('Cargamos un ejemplo de una persona ficticia. Reemplázalo con tus datos.');
                }}
              >
                <Icon name="sparkles" size={16} /> Cargar ejemplo
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()} title="Importar un respaldo .json">
              <Icon name="upload" size={16} /> Importar
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importJson} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="Descargar un respaldo .json para usarlo en otro navegador o equipo"
              onClick={() => downloadBlob(JSON.stringify(cv, null, 2), `${suggestedFileName(cv)}_respaldo.json`, 'application/json')}
            >
              <Icon name="json" size={16} /> Respaldo
            </button>
            {!isEmpty(cv) && (
              <span className="toolbar-danger">
                <ConfirmButton
                  label="Borrar todo"
                  text="¿Borrar toda la hoja de vida?"
                  onConfirm={() => {
                    setCv(emptyCv());
                    setStep('personal');
                    flash('Hoja de vida borrada de este navegador.');
                  }}
                />
              </span>
            )}
          </div>
        </div>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      <div className="mobile-switch" role="tablist" aria-label="Vista">
        <button type="button" role="tab" aria-selected={mobileView === 'form'} onClick={() => setMobileView('form')}>
          <Icon name="edit" size={16} /> Editar
        </button>
        <button type="button" role="tab" aria-selected={mobileView === 'preview'} onClick={() => setMobileView('preview')}>
          <Icon name="eye" size={16} /> Vista previa
        </button>
      </div>

      <div className={`editor-layout view-${mobileView}`}>
        <nav className="steps-nav" aria-label="Pasos">
          <p className="steps-progress">
            <span>
              {Math.min(doneCount, required)} de {required} secciones esenciales
            </span>
            <span className="steps-bar" aria-hidden="true">
              <span style={{ width: `${(Math.min(doneCount, required) / required) * 100}%` }} />
            </span>
          </p>
          <ol>
            {STEPS.map((s, i) => {
              const done = s.done(cv);
              return (
                <li key={s.id}>
                  <button type="button" className={`step-link${step === s.id ? ' is-active' : ''}${done ? ' is-done' : ''}`} aria-current={step === s.id ? 'step' : undefined} onClick={() => go(s.id)}>
                    <span className="step-n">{done ? <Icon name="check" size={14} /> : i + 1}</span>
                    <span className="step-label">
                      {s.title}
                      {s.optional && <span className="muted"> · opcional</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="editor-form" ref={formTop}>
          <div className="form-card">
            {!hydrated ? (
              <div className="skeleton" aria-hidden="true" />
            ) : (
              <>
                {step === 'personal' && <PersonalStep {...stepProps} />}
                {step === 'summary' && <SummaryStep {...stepProps} />}
                {step === 'experience' && <ExperienceStep {...stepProps} />}
                {step === 'education' && <EducationStep {...stepProps} />}
                {step === 'skills' && <SkillsStep {...stepProps} />}
                {step === 'extras' && <ExtrasStep {...stepProps} />}
                {step === 'languages' && <LanguagesStep {...stepProps} />}
                {step === 'design' && <DesignStep {...stepProps} />}
                {step === 'review' && <ReviewStep {...stepProps} onPrint={print} />}
              </>
            )}
            <div className="step-nav">
              {prev ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => go(prev.id)}>
                  <Icon name="chevronLeft" size={16} /> {prev.short}
                </button>
              ) : (
                <span />
              )}
              {next ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => go(next.id)}>
                  {next.short} <Icon name="chevronRight" size={16} />
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={print}>
                  <Icon name="printer" size={16} /> Guardar como PDF
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="editor-preview" aria-label="Vista previa de la hoja de vida">
          <div className="preview-toolbar">
            <span className="muted">Vista previa en vivo</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={print}>
              <Icon name="download" size={16} /> PDF
            </button>
          </div>
          {hydrated && <Preview cv={cv} />}
        </aside>
      </div>

      {/* Copia sin escalar que solo aparece al imprimir: es la que se convierte en PDF. */}
      {mounted &&
        createPortal(
          <div className="cv-print-host">
            <CvDocument cv={cv} />
          </div>,
          document.body,
        )}
    </div>
  );
}
