import Brand from './Brand';
import Icon from './Icon';

import { ECOSYSTEM } from '@/lib/site';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Brand compact />
          <p className="muted">
            <Icon name="lock" size={14} /> Tus datos se guardan solo en este navegador. Perfila no tiene servidor de datos ni cuentas.
          </p>
        </div>
        {ECOSYSTEM.length > 0 && (
          <div className="footer-eco">
            <span className="footer-eco-title">Más de ZENTRIKA</span>
            <ul>
              {ECOSYSTEM.map((p) => (
                <li key={p.name}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <strong>{p.name}</strong> <span className="muted">· {p.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </footer>
  );
}
