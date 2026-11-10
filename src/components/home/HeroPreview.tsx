import ScaledSheet from '@/components/templates/ScaledSheet';
import { analyze } from '@/lib/ats/analyze';
import { toPlainText } from '@/lib/cv/plaintext';
import { sampleCv } from '@/lib/cv/sample';

/** Vista real de una plantilla con datos de ejemplo (persona ficticia), escalada como miniatura. */
export default function HeroPreview() {
  const cv = sampleCv();
  const report = analyze({ text: toPlainText(cv), source: 'editor' });
  return (
    <div className="hero-preview" aria-hidden="true">
      <div className="hero-paper">
        <ScaledSheet cv={cv} />
      </div>
      <div className="hero-score">
        <span className="hero-score-n">{report.score}</span>
        <span>
          <strong>Puntaje ATS de este ejemplo</strong>
          <span className="muted">Una columna · texto real · títulos estándar</span>
        </span>
      </div>
    </div>
  );
}
