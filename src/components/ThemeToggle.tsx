'use client';

import { useEffect, useState } from 'react';

import Icon from './Icon';

import { STORAGE_KEYS } from '@/lib/storage';

type Theme = 'dark' | 'light';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEYS.theme, next);
    } catch {
      /* sin almacenamiento */
    }
  };

  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title="Cambiar tema">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}
