import Icon from '@/components/Icon';
import type { Category, Check, KeywordResult, Report } from '@/lib/ats/analyze';

export function ScoreRing({ score, label, tone, size = 132 }: { score: number; label: string; tone: Report['grade']['tone']; size?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className={`score-ring tone-${tone}`} style={{ width: size, height: size }} role="img" aria-label={`Puntaje ATS: ${score} de 100, ${label}`}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="ring-track" />
        <circle cx="60" cy="60" r={r} className="ring-value" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
      </svg>
      <span className="score-ring-center" aria-hidden="true">
        <span className="score-n">{score}</span>
        <span className="score-l">{label}</span>
      </span>
    </div>
  );
}

const STATUS_ICON = { pass: 'checkCircle', warn: 'alert', fail: 'xCircle' } as const;
const STATUS_LABEL = { pass: 'Cumple', warn: 'Mejorable', fail: 'No cumple' } as const;

export function CheckItem({ check }: { check: Check }) {
  return (
    <li className={`check status-${check.status}`}>
      <Icon name={STATUS_ICON[check.status]} size={18} />
      <div>
        <p className="check-title">
          {check.title} <span className="visually-hidden">({STATUS_LABEL[check.status]})</span>
        </p>
        <p className="check-detail">{check.detail}</p>
        {check.fix && check.status !== 'pass' && <p className="check-fix">{check.fix}</p>}
      </div>
    </li>
  );
}

export function CategoryCard({ cat }: { cat: Category }) {
  const pct = Math.round(cat.score * 100);
  const issues = cat.checks.filter((c) => c.status !== 'pass').length;
  const ordered = [...cat.checks].sort((a, b) => order(a.status) - order(b.status));
  return (
    <section className="cat-card">
      <header className="cat-head">
        <h3>{cat.title}</h3>
        <span className={`cat-score ${pct >= 85 ? 'great' : pct >= 65 ? 'good' : pct >= 45 ? 'meh' : 'bad'}`}>{pct}</span>
      </header>
      <div className="cat-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="cat-sub muted">{issues === 0 ? 'Todo en orden' : `${issues} ${issues === 1 ? 'punto por mejorar' : 'puntos por mejorar'}`}</p>
      <ul className="checks">
        {ordered.map((c) => (
          <CheckItem key={c.id} check={c} />
        ))}
      </ul>
    </section>
  );
}

const order = (s: Check['status']) => (s === 'fail' ? 0 : s === 'warn' ? 1 : 2);

export function KeywordPanel({ kw }: { kw: KeywordResult }) {
  return (
    <div className="kw-panel">
      <div className="kw-col">
        <h4>
          <Icon name="checkCircle" size={16} /> En tu CV ({kw.found.length})
        </h4>
        <div className="kw-chips">
          {kw.found.length ? kw.found.map((k) => <span key={k} className="kw ok">{k}</span>) : <span className="muted">Ninguna todavía.</span>}
        </div>
      </div>
      <div className="kw-col">
        <h4>
          <Icon name="alert" size={16} /> Faltan ({kw.missing.length})
        </h4>
        <div className="kw-chips">
          {kw.missing.length ? kw.missing.map((k) => <span key={k} className="kw miss">{k}</span>) : <span className="muted">¡Ninguna! Cubres la oferta.</span>}
        </div>
      </div>
      <p className="muted kw-note">Agrega solo las que sean verdad. El ATS filtra por coincidencia, pero el reclutador te va a preguntar por cada una.</p>
    </div>
  );
}

/** Lista breve de lo más importante por corregir, en orden de impacto. */
export function TopFixes({ report, max = 4 }: { report: Report; max?: number }) {
  const items = report.categories
    .flatMap((c) => c.checks.map((k) => ({ ...k, w: c.weight * (k.weight ?? 1) })))
    .filter((k) => k.status !== 'pass')
    .sort((a, b) => order(a.status) - order(b.status) || b.w - a.w)
    .slice(0, max);
  if (!items.length) return <p className="top-fixes-ok">Nada urgente: cumple las normas principales.</p>;
  return (
    <ol className="top-fixes">
      {items.map((k) => (
        <li key={k.id} className={`status-${k.status}`}>
          <strong>{k.title}.</strong> {k.fix ?? k.detail}
        </li>
      ))}
    </ol>
  );
}
