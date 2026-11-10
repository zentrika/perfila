/** Datos de marca y enlaces al ecosistema ZENTRIKA. Las URL se ajustan por entorno. */
export const PRODUCT = 'Perfila';
export const BRAND = 'ZENTRIKA';
export const TAGLINE = 'Hojas de vida que los ATS leen y los reclutadores recuerdan.';

const isDev = process.env.NODE_ENV === 'development';
/** En desarrollo, los demás proyectos de ZENTRIKA corren en local; en producción solo se enlazan si se configuran. */
const devDefault = (url: string) => (isDev ? url : '');

/** URL pública: la variable explícita, o la de producción que Vercel inyecta, o la local. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://127.0.0.1:3200');

/** Otros productos de ZENTRIKA. Si una URL no está configurada, el enlace no se muestra. */
export const ECOSYSTEM = [
  {
    name: 'Órbita',
    description: 'Proyectos, tareas y equipos',
    url: process.env.NEXT_PUBLIC_ORBITA_URL || devDefault('http://127.0.0.1:3000'),
  },
  {
    name: 'Zentrika.com',
    description: 'Ingeniería que transforma ideas',
    url: process.env.NEXT_PUBLIC_ZENTRIKA_URL || devDefault('http://127.0.0.1:3100'),
  },
].filter((p) => p.url);

/** Repositorio público, para invitar a reportar ideas y errores. */
export const REPO_URL = 'https://github.com/zentrika/perfila';
