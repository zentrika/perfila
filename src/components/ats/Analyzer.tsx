'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';

import { CategoryCard, KeywordPanel, ScoreRing, TopFixes } from './ReportParts';

import Icon from '@/components/Icon';
import { analyze } from '@/lib/ats/analyze';
import { analyzeFile, type FileAnalysis } from '@/lib/ats/file';
import { STORAGE_KEYS, readJson, removeKey, writeJson } from '@/lib/storage';

interface Saved {
  jd: string;
  result: Omit<FileAnalysis, 'report'> | null;
}

/**
 * Analizador ATS. El archivo se lee en el navegador; solo se guarda el texto extraído y los
 * metadatos (no el archivo), para que el informe siga ahí al recargar.
 */
export default function Analyzer() {
  const [jd, setJd] = useState('');
  const [result, setResult] = useState<Omit<FileAnalysis, 'report'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [tab, setTab] = useState<'report' | 'text'>('report');
  const [hydrated, setHydrated] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = readJson(STORAGE_KEYS.ats) as Saved | null;
    if (raw && typeof raw === 'object') {
      if (typeof raw.jd === 'string') setJd(raw.jd);
      if (raw.result && typeof raw.result.text === 'string' && raw.result.input) setResult(raw.result);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => writeJson(STORAGE_KEYS.ats, { jd: jd.slice(0, 12000), result } satisfies Saved), 300);
    return () => clearTimeout(t);
  }, [jd, result, hydrated]);

  // El informe se recalcula con la oferta actual: así se actualiza mientras pegas el aviso.
  const report = useMemo(() => (result ? analyze({ ...result.input, jobDescription: jd }) : null), [result, jd]);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const r = await analyzeFile(file, jd);
      const { fileName, fileSize, kind, text, meta, input: analyzed, analyzedAt } = r;
      setResult({ fileName, fileSize, kind, text, meta, input: analyzed, analyzedAt });
      setTab('report');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude leer el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handle(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="analyzer container">
      <header className="page-head">
        <p className="eyebrow">Analizador ATS</p>
        <h1>¿Qué tanto cumple tu hoja de vida con las normas ATS?</h1>
        <p className="muted lead">
          Arrastra tu CV y lo leemos como lo haría un sistema de selección: extraemos el texto, buscamos tus secciones y datos de contacto y revisamos el formato. Si pegas
          una oferta, comparamos las palabras clave.
        </p>
      </header>

      <div className="analyzer-grid">
        <div className="analyzer-inputs">
          <div
            className={`dropzone${drag ? ' is-drag' : ''}${busy ? ' is-busy' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => input.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                input.current?.click();
              }
            }}
            aria-label="Subir hoja de vida en PDF, DOCX o TXT"
          >
            <input ref={input} type="file" hidden accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(e) => handle(e.target.files?.[0])} />
            <span className="dropzone-icon">
              <Icon name={busy ? 'refresh' : 'upload'} size={26} className={busy ? 'spin' : undefined} />
            </span>
            <strong>{busy ? 'Leyendo tu hoja de vida…' : result ? 'Analizar otro archivo' : 'Arrastra tu hoja de vida aquí'}</strong>
            <span className="muted">o haz clic para elegirla · PDF, DOCX o TXT · máx. 10 MB</span>
            <span className="dropzone-privacy">
              <Icon name="lock" size={13} /> El archivo no sale de tu navegador
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              <Icon name="alert" size={16} /> {error}
            </p>
          )}

          <div className="jd-box">
            <label htmlFor="jd" className="sub-h">
              <Icon name="target" size={18} /> Oferta de empleo (opcional)
            </label>
            <p className="muted">Pega la descripción del cargo para ver qué palabras clave del aviso tienes y cuáles te faltan.</p>
            <textarea id="jd" className="input textarea" rows={7} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Ej.: Buscamos Analista de Datos con SQL, Python y Power BI…" />
          </div>

          <aside className="tip">
            <Icon name="info" size={16} />
            <div>
              <strong>¿Cómo se calcula?</strong> Revisamos cinco grupos: lectura del archivo (30 %), formato (10 %), contacto (15 %), estructura (20 %) y contenido (25 %).
              Con una oferta se suma la coincidencia de palabras clave (25 %). Es una simulación: cada ATS es distinto, pero estas reglas son comunes a casi todos.
            </div>
          </aside>
        </div>

        <div className="analyzer-result">
          {!result || !report ? (
            <div className="result-empty">
              <Icon name="scan" size={36} />
              <h2>Tu informe aparecerá aquí</h2>
              <p className="muted">Verás un puntaje de 0 a 100, lo más importante por corregir y el texto exacto que extrae un ATS de tu archivo.</p>
            </div>
          ) : (
            <>
              <div className="result-head">
                <ScoreRing score={report.score} label={report.grade.label} tone={report.grade.tone} />
                <div className="result-meta">
                  <p className="result-file">
                    <Icon name="file" size={16} /> <strong>{result.fileName}</strong>
                  </p>
                  <ul className="meta-list">
                    <li>{result.kind.toUpperCase()}</li>
                    {result.meta.pages != null && <li>{result.meta.pages === 1 ? '1 página' : `${result.meta.pages} páginas`}</li>}
                    <li>{report.stats.words} palabras</li>
                    <li>{Math.max(1, Math.round(result.fileSize / 1024))} KB</li>
                    {result.meta.producer && <li title="Programa con el que se generó">{result.meta.producer.slice(0, 40)}</li>}
                  </ul>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setResult(null);
                      removeKey(STORAGE_KEYS.ats);
                    }}
                  >
                    Borrar análisis
                  </button>
                </div>
              </div>

              <section className="fix-box">
                <h2 className="sub-h">Lo más importante por corregir</h2>
                <TopFixes report={report} />
                {report.score < 85 && (
                  <Link href="/crear" className="btn btn-primary btn-sm">
                    <Icon name="edit" size={16} /> Rehacerla con una plantilla ATS
                  </Link>
                )}
              </section>

              {report.keywords && (
                <section className="fix-box">
                  <h2 className="sub-h">Palabras clave de la oferta · {Math.round(report.keywords.ratio * 100)} %</h2>
                  <KeywordPanel kw={report.keywords} />
                </section>
              )}

              <div className="tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'report'} onClick={() => setTab('report')}>
                  Informe detallado
                </button>
                <button type="button" role="tab" aria-selected={tab === 'text'} onClick={() => setTab('text')}>
                  Así lo lee el ATS
                </button>
              </div>

              {tab === 'report' ? (
                <div className="cat-grid">
                  {report.categories.map((c) => (
                    <CategoryCard key={c.id} cat={c} />
                  ))}
                </div>
              ) : (
                <section className="ats-text">
                  <p className="muted">
                    Este es el texto, en orden, que obtuvimos de tu archivo. Si ves líneas mezcladas, palabras pegadas o información que falta, un ATS tendrá el mismo problema.
                  </p>
                  <pre>{result.text || '(No se pudo extraer texto)'}</pre>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
