import Link from 'next/link';

import ContinueCard from '@/components/home/ContinueCard';
import HeroPreview from '@/components/home/HeroPreview';
import Icon, { type IconName } from '@/components/Icon';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'edit',
    title: 'Formulario guiado',
    body: 'Te pide cada dato en el orden en que lo lee un reclutador, con consejos en cada paso. Ves el resultado mientras escribes.',
  },
  {
    icon: 'layers',
    title: 'Plantillas compatibles con ATS',
    body: 'Cuatro diseños de una sola columna, con texto real y títulos estándar. Descárgalos en PDF, Word o texto plano.',
  },
  {
    icon: 'scan',
    title: 'Analizador de hojas de vida',
    body: 'Arrastra tu CV actual y mira cómo lo lee un ATS: el texto que extrae, qué falla y qué palabras de la oferta te faltan.',
  },
];

const RULES: { title: string; body: string }[] = [
  { title: 'Una sola columna', body: 'Con dos columnas, el ATS mezcla las líneas de ambas.' },
  { title: 'Texto real, no imágenes', body: 'Fotos, íconos y barras de nivel no se leen.' },
  { title: 'Títulos estándar', body: '«Experiencia laboral», no «Mi trayectoria».' },
  { title: 'Fechas consistentes', body: 'Mes y año, siempre en el mismo formato.' },
  { title: 'Palabras de la oferta', body: 'El ATS filtra por los términos del aviso.' },
  { title: 'Contacto en el cuerpo', body: 'No en encabezados, pies de página ni cuadros de texto.' },
  { title: 'Logros con cifras', body: 'Verbo de acción + qué hiciste + resultado medible.' },
  { title: 'Archivo limpio', body: 'PDF con texto o DOCX, menos de 2 MB, Nombre_Apellido_CV.' },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="badge">Gratis · Sin registro</span> Perfila — by ZENTRIKA
            </p>
            <h1>
              Hojas de vida que los ATS <span className="accent">leen</span> y los reclutadores recuerdan.
            </h1>
            <p className="lead">
              Crea tu CV con plantillas pensadas para los sistemas de selección, o analiza el que ya tienes y descubre por qué no te llaman.
            </p>
            <div className="hero-actions">
              <Link href="/crear" className="btn btn-primary">
                <Icon name="edit" /> Crear mi hoja de vida
              </Link>
              <Link href="/analizar" className="btn btn-ghost">
                <Icon name="scan" /> Analizar mi CV
              </Link>
            </div>
            <p className="hero-note muted">
              <Icon name="lock" size={15} /> Todo ocurre en tu navegador. Tus datos no se envían a ningún servidor y siguen aquí aunque recargues la página.
            </p>
            <ContinueCard />
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="feature">
                <span className="feature-icon">
                  <Icon name={f.icon} size={22} />
                </span>
                <h2>{f.title}</h2>
                <p className="muted">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-rules">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Normas ATS</p>
            <h2>Lo que revisa un sistema de selección antes que una persona</h2>
            <p className="muted">
              Un ATS (sistema de seguimiento de candidatos) convierte tu archivo en texto, lo divide en secciones y lo compara con la oferta. Si no puede leerlo, tu CV
              no llega a manos del reclutador. Perfila aplica estas reglas en cada plantilla y las revisa en el analizador.
            </p>
          </div>
          <ol className="rule-grid">
            {RULES.map((r, i) => (
              <li key={r.title} className="rule">
                <span className="rule-n">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{r.title}</h3>
                  <p className="muted">{r.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container cta-band">
          <div>
            <h2>¿Ya tienes una hoja de vida?</h2>
            <p className="muted">Pégale la oferta a la que quieres aplicar y mira qué tanto coincide.</p>
          </div>
          <Link href="/analizar" className="btn btn-primary">
            <Icon name="target" /> Comparar con una oferta
          </Link>
        </div>
      </section>
    </>
  );
}
