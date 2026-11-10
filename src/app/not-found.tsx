import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section">
      <div className="container container-narrow not-found">
        <p className="eyebrow">Error 404</p>
        <h1>Esta página no existe</h1>
        <p className="muted">Puede que el enlace esté mal escrito.</p>
        <div className="hero-actions">
          <Link href="/crear" className="btn btn-primary">
            Crear hoja de vida
          </Link>
          <Link href="/" className="btn btn-ghost">
            Ir al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
