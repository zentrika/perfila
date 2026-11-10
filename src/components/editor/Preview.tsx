'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import CvDocument from '@/components/templates/CvDocument';
import type { CvData } from '@/lib/cv/types';

const MM = 96 / 25.4;
/** Tamaños de página y margen vertical de impresión (deben coincidir con `.cv-sheet` y la regla @page). */
export const PAGE = {
  letter: { w: 816, h: 1056 },
  a4: { w: 794, h: 1123 },
  padY: 13 * MM,
};

/**
 * Simula los saltos de página que hará el navegador al imprimir, con las mismas reglas de cv.css:
 * ninguna entrada se parte, un título nunca queda solo al final de una página y las secciones
 * cortas (todas menos Experiencia) van enteras. Donde un bloque no cabe, se empuja a la página
 * siguiente aumentando su margen superior (así las líneas del bloque viajan con él), y la vista
 * previa coincide con el PDF.
 */
function paginate(sheet: HTMLElement, contentH: number): number {
  const padTop = parseFloat(getComputedStyle(sheet).paddingTop) || 0;
  const blocks: { el: HTMLElement; top: number; bottom: number }[] = [];
  const top = (el: HTMLElement) => el.offsetTop - padTop;
  const bottom = (el: HTMLElement) => el.offsetTop + el.offsetHeight - padTop;

  for (const child of Array.from(sheet.children) as HTMLElement[]) {
    if (!child.classList.contains('cv-section')) {
      blocks.push({ el: child, top: top(child), bottom: bottom(child) });
      continue;
    }
    if (!child.classList.contains('cv-s-experience')) {
      blocks.push({ el: child, top: top(child), bottom: bottom(child) });
      continue;
    }
    // Experiencia: el título va pegado a la primera entrada; cada entrada es un bloque.
    const entries = Array.from(child.querySelectorAll<HTMLElement>(':scope > .cv-entry'));
    if (!entries.length) {
      blocks.push({ el: child, top: top(child), bottom: bottom(child) });
      continue;
    }
    blocks.push({ el: child, top: top(child), bottom: bottom(entries[0]) });
    for (const e of entries.slice(1)) blocks.push({ el: e, top: top(e), bottom: bottom(e) });
  }

  let shift = 0;
  for (const b of blocks) {
    const t = b.top + shift;
    const h = b.bottom - b.top;
    if (h > contentH || t <= 0) continue; // más alto que una página: el navegador lo parte igual
    const pageEnd = (Math.floor(t / contentH) + 1) * contentH;
    if (t + h > pageEnd + 0.5) {
      const push = pageEnd - t;
      b.el.style.marginTop = `${(parseFloat(getComputedStyle(b.el).marginTop) || 0) + push}px`;
      b.el.dataset.pushed = '1';
      shift += push;
    }
  }
  const last = blocks[blocks.length - 1];
  return last ? last.bottom + shift : 0;
}

export default function Preview({ cv }: { cv: CvData }) {
  const wrap = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [usedH, setUsedH] = useState(0);
  const paper = PAGE[cv.settings.paper];
  const contentH = paper.h - 2 * PAGE.padY;

  const layout = useCallback(() => {
    const sheet = content.current?.querySelector<HTMLElement>('.cv-sheet');
    if (!sheet) return;
    sheet.querySelectorAll<HTMLElement>('[data-pushed]').forEach((el) => {
      el.style.marginTop = '';
      delete el.dataset.pushed;
    });
    setUsedH(paginate(sheet, contentH));
  }, [contentH]);

  // Después de cada cambio en la hoja (y cuando terminan de cargar las fuentes).
  useLayoutEffect(() => {
    layout();
    let alive = true;
    document.fonts?.ready.then(() => alive && layout());
    return () => {
      alive = false;
    };
  }, [cv, layout]);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / paper.w));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paper.w]);

  const pages = Math.max(1, Math.ceil((usedH - 1) / contentH));
  const guides = Array.from({ length: pages - 1 }, (_, i) => PAGE.padY + (i + 1) * contentH);

  return (
    <div className="preview" ref={wrap}>
      <div className="preview-frame" style={{ height: pages * paper.h * scale, width: paper.w * scale }}>
        <div className="preview-scale" style={{ transform: `scale(${scale})`, width: paper.w }}>
          <div className="preview-sheet" style={{ minHeight: pages * paper.h }}>
            <div ref={content}>
              <CvDocument cv={cv} />
            </div>
            {guides.map((y, i) => (
              <div key={i} className="page-guide" style={{ top: y }}>
                <span>Página {i + 2}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="preview-foot muted">
        {pages === 1 ? '1 página' : `${pages} páginas`} · {cv.settings.paper === 'letter' ? 'Carta' : 'A4'}
        {pages > 2 && ' · Intenta dejarla en 2 páginas como máximo.'}
      </p>
    </div>
  );
}
