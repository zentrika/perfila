'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import Icon from '@/components/Icon';
import { sanitizeCv } from '@/lib/cv/defaults';
import { STORAGE_KEYS, readJson, timeAgo } from '@/lib/storage';

/** Si hay una hoja de vida guardada en este navegador, ofrece retomarla. */
export default function ContinueCard() {
  const [info, setInfo] = useState<{ name: string; at: number | null } | null>(null);

  useEffect(() => {
    const raw = readJson(STORAGE_KEYS.cv);
    if (!raw) return;
    const cv = sanitizeCv(raw);
    const hasData = cv.personal.fullName || cv.summary || cv.experience.length || cv.education.length;
    if (!hasData) return;
    const at = readJson(STORAGE_KEYS.cvSavedAt);
    setInfo({ name: cv.personal.fullName || 'Hoja de vida sin nombre', at: typeof at === 'number' ? at : null });
  }, []);

  if (!info) return null;
  return (
    <Link href="/crear" className="continue-card">
      <span className="continue-icon">
        <Icon name="file" />
      </span>
      <span>
        <strong>Continuar con «{info.name}»</strong>
        <span className="muted">{info.at ? `Guardada ${timeAgo(info.at)} en este navegador` : 'Guardada en este navegador'}</span>
      </span>
      <Icon name="chevronRight" />
    </Link>
  );
}
