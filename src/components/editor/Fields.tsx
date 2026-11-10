'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import Icon from '@/components/Icon';
import { MONTHS_UI } from '@/lib/cv/format';

export function Field({ label, hint, htmlFor, children, extra, wide }: { label: string; hint?: string; htmlFor?: string; children: ReactNode; extra?: ReactNode; wide?: boolean }) {
  return (
    <div className={`field${wide ? ' field-wide' : ''}`}>
      <div className="field-top">
        <label htmlFor={htmlFor}>{label}</label>
        {extra}
      </div>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  autoComplete,
  wide,
  maxLength = 200,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  wide?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} wide={wide}>
      <input id={id} className="input" type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
  maxLength = 2000,
  counter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  maxLength?: number;
  counter?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} extra={counter} wide>
      <textarea id={id} className="input textarea" rows={rows} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function Select<T extends string>({ label, value, onChange, options, hint }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select id={id} className="input select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 56 }, (_, i) => String(THIS_YEAR + 5 - i));

/** Mes y año con dos listas: funciona igual en todos los navegadores (Safari no tiene `type="month"`). */
export function MonthYear({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const id = useId();
  const [y, m] = value ? value.split('-') : ['', ''];
  const set = (year: string, month: string) => onChange(year ? (month ? `${year}-${month}` : year) : '');
  return (
    <Field label={label} htmlFor={`${id}-m`}>
      <div className="month-year">
        <select id={`${id}-m`} className="input select" value={m ?? ''} disabled={disabled} onChange={(e) => set(y || String(THIS_YEAR), e.target.value)} aria-label={`${label}: mes`}>
          <option value="">Mes</option>
          {MONTHS_UI.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, '0')}>
              {name}
            </option>
          ))}
        </select>
        <select className="input select" value={y ?? ''} disabled={disabled} onChange={(e) => set(e.target.value, m ?? '')} aria-label={`${label}: año`}>
          <option value="">Año</option>
          {YEARS.map((yy) => (
            <option key={yy} value={yy}>
              {yy}
            </option>
          ))}
        </select>
      </div>
    </Field>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="checkbox-box" aria-hidden="true">
        <Icon name="check" size={13} />
      </span>
      {label}
    </label>
  );
}

/** Etiquetas: se agregan con Enter o coma; Retroceso borra la última si el campo está vacío. */
export function TagInput({ label, items, onChange, placeholder, suggestions = [] }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...items];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase()) && next.length < 40) next.push(p.slice(0, 60));
    onChange(next);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && items.length) {
      onChange(items.slice(0, -1));
    }
  };
  const remaining = suggestions.filter((s) => !items.some((i) => i.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <Field label={label} htmlFor={id} wide hint="Escribe y pulsa Enter o coma para agregar.">
      <div className="tags">
        {items.map((t, i) => (
          <span className="tag" key={`${t}-${i}`}>
            {t}
            <button type="button" aria-label={`Quitar ${t}`} onClick={() => onChange(items.filter((_, k) => k !== i))}>
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input id={id} className="tags-input" value={draft} placeholder={items.length ? '' : placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={() => add(draft)} />
      </div>
      {remaining.length > 0 && (
        <div className="suggest">
          {remaining.map((s) => (
            <button type="button" key={s} className="chip" onClick={() => add(s)}>
              <Icon name="plus" size={12} /> {s}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

export function Tip({ children, title = 'Consejo ATS' }: { children: ReactNode; title?: string }) {
  return (
    <aside className="tip">
      <Icon name="info" size={16} />
      <div>
        <strong>{title}</strong> {children}
      </div>
    </aside>
  );
}

/** Lista de tarjetas repetibles con plegado, orden, duplicado y borrado. */
export function Repeater<T extends { id: string }>({
  items,
  onChange,
  create,
  titleOf,
  subtitleOf,
  render,
  addLabel,
  empty,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  titleOf: (item: T) => string;
  subtitleOf?: (item: T) => string;
  render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel: string;
  empty: string;
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);

  const update = (id: string, patch: Partial<T>) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="repeater">
      {items.length === 0 && <p className="empty muted">{empty}</p>}
      {items.map((it, i) => {
        const isOpen = open === it.id;
        return (
          <div key={it.id} className={`rep-card${isOpen ? ' is-open' : ''}`}>
            <div className="rep-head">
              <button type="button" className="rep-toggle" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : it.id)}>
                <Icon name={isOpen ? 'down' : 'chevronRight'} size={16} />
                <span className="rep-title">
                  <strong>{titleOf(it) || 'Sin título'}</strong>
                  {subtitleOf && subtitleOf(it) && <span className="muted">{subtitleOf(it)}</span>}
                </span>
              </button>
              <div className="rep-actions">
                <button type="button" className="icon-btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                  <Icon name="up" size={16} />
                </button>
                <button type="button" className="icon-btn sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar">
                  <Icon name="down" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn sm"
                  aria-label="Duplicar"
                  onClick={() => {
                    const copy = { ...structuredClone(it), id: create().id };
                    const next = [...items];
                    next.splice(i + 1, 0, copy);
                    onChange(next);
                    setOpen(copy.id);
                  }}
                >
                  <Icon name="copy" size={16} />
                </button>
                <ConfirmButton onConfirm={() => onChange(items.filter((x) => x.id !== it.id))} label="Eliminar" />
              </div>
            </div>
            {isOpen && <div className="rep-body">{render(it, (patch) => update(it.id, patch))}</div>}
          </div>
        );
      })}
      <button
        type="button"
        className="btn btn-ghost btn-sm add-btn"
        onClick={() => {
          const item = create();
          onChange([...items, item]);
          setOpen(item.id);
        }}
      >
        <Icon name="plus" /> {addLabel}
      </button>
    </div>
  );
}

/** Botón de borrado en dos pasos, sin diálogos del navegador. */
export function ConfirmButton({ onConfirm, label, text }: { onConfirm: () => void; label: string; text?: string }) {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <span className="confirm">
        <span>{text ?? '¿Eliminar?'}</span>
        <button
          type="button"
          className="btn-link danger"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          Sí
        </button>
        <button type="button" className="btn-link" onClick={() => setAsking(false)}>
          No
        </button>
      </span>
    );
  }
  return (
    <button type="button" className="icon-btn sm" aria-label={label} onClick={() => setAsking(true)}>
      <Icon name="trash" size={16} />
    </button>
  );
}
