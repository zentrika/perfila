'use client';

import { useEffect, useMemo, useState } from 'react';

import type { StepProps } from './Steps';

import { CategoryCard, KeywordPanel, ScoreRing, TopFixes } from '@/components/ats/ReportParts';
import Icon from '@/components/Icon';
import { analyze } from '@/lib/ats/analyze';
import { toDocx } from '@/lib/cv/docx';
import { suggestedFileName } from '@/lib/cv/format';
import { toPlainText } from '@/lib/cv/plaintext';
import { copyText, downloadBlob } from '@/lib/download';
import { readJson, writeJson } from '@/lib/storage';

const JD_KEY = 'perfila:editor:jd';

export default function ReviewStep({ cv, onPrint }: StepProps & { onPrint: () => void }) {
  const [jd, setJd] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const v = readJson(JD_KEY);
    if (typeof v === 'string') setJd(v);
  }, []);
  const updateJd = (v: string) => {
    setJd(v);
    writeJson(JD_KEY, v.slice(0, 12000));
  };

  const text = useMemo(() => toPlainText(cv), [cv]);
  const report = useMemo(() => analyze({ text, source: 'editor', jobDescription: jd }), [text, jd]);
  const name = suggestedFileName(cv);

  return (
    <>
      <header className="step-head">
        <h1>Revisar y descargar</h1>
        <p className="muted">Revisamos tu contenido con las mismas reglas del analizador. El formato ya cumple: las plantillas de Perfila son de una columna y con texto real.</p>
      </header>

      <div className="review-top">
        <ScoreRing score={report.score} label={report.grade.label} tone={report.grade.tone} />
        <div className="review-fixes">
          <h2 className="sub-h">Lo más importante por mejorar</h2>
          <TopFixes report={report} />
        </div>
      </div>

      <section className="export-box">
        <h2 className="sub-h">Descargar</h2>
        <div className="export-grid">
          <button type="button" className="export-btn primary" onClick={onPrint}>
            <Icon name="printer" size={22} />
            <span>
              <strong>PDF</strong>
              <span>Recomendado. Texto real y seleccionable.</span>
            </span>
          </button>
          <button type="button" className="export-btn" onClick={() => downloadBlob(toDocx(cv), `${name}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}>
            <Icon name="file" size={22} />
            <span>
              <strong>Word (.docx)</strong>
              <span>Para portales que lo piden o para editar.</span>
            </span>
          </button>
          <button type="button" className="export-btn" onClick={() => downloadBlob(text, `${name}.txt`, 'text/plain;charset=utf-8')}>
            <Icon name="text" size={22} />
            <span>
              <strong>Texto plano (.txt)</strong>
              <span>Para pegar en formularios de empleo.</span>
            </span>
          </button>
          <button
            type="button"
            className="export-btn"
            onClick={async () => {
              if (await copyText(text)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }
            }}
          >
            <Icon name={copied ? 'check' : 'copy'} size={22} />
            <span>
              <strong>{copied ? '¡Copiado!' : 'Copiar texto'}</strong>
              <span>Todo el CV, listo para pegar.</span>
            </span>
          </button>
        </div>
        <p className="export-note muted">
          <Icon name="info" size={14} /> Al guardar como PDF, elige <strong>Guardar como PDF</strong> como destino y desactiva <strong>Encabezados y pies de página</strong>.
          El archivo se sugiere como <code>{name}.pdf</code>.
        </p>
      </section>

      <section className="jd-box">
        <h2 className="sub-h">
          <Icon name="target" size={18} /> Compara con una oferta (opcional)
        </h2>
        <p className="muted">Pega la descripción del cargo. Te mostramos qué palabras clave del aviso aparecen en tu hoja de vida y cuáles faltan.</p>
        <textarea className="input textarea" rows={5} value={jd} onChange={(e) => updateJd(e.target.value)} placeholder="Pega aquí la oferta de empleo…" aria-label="Descripción de la oferta" />
        {report.keywords && <KeywordPanel kw={report.keywords} />}
      </section>

      <div className="cat-grid">
        {report.categories.map((c) => (
          <CategoryCard key={c.id} cat={c} />
        ))}
      </div>
    </>
  );
}
