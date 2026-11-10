'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import CvDocument from './CvDocument';

import type { CvData } from '@/lib/cv/types';

const WIDTH = { letter: 816, a4: 794 };

/** Miniatura de la hoja: se escala al ancho de su contenedor, sea cual sea. */
export default function ScaledSheet({ cv, className }: { cv: CvData; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const w = WIDTH[cv.settings.paper];

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / w);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  return (
    <div ref={box} className={`scaled-sheet ${className ?? ''}`}>
      <div className="scaled-sheet-inner" style={{ width: w, transform: `scale(${scale || 0.3})`, visibility: scale ? 'visible' : 'hidden' }}>
        <CvDocument cv={cv} />
      </div>
    </div>
  );
}
