/** Datos de marca y enlaces al ecosistema ZENTRIKA. Las URL se ajustan por entorno. */
export const PRODUCT = 'Perfila';
export const BRAND = 'ZENTRIKA';
export const TAGLINE = 'Hojas de vida que los ATS leen y los reclutadores recuerdan.';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3200';

/** Otros productos de ZENTRIKA. Si una URL no está configurada, el enlace no se muestra. */
export const ECOSYSTEM = [
  {
    name: 'Órbita',
    description: 'Proyectos, tareas y equipos',
    url: process.env.NEXT_PUBLIC_ORBITA_URL ?? 'http://127.0.0.1:3000',
  },
  {
    name: 'Zentrika.com',
    description: 'Ingeniería que transforma ideas',
    url: process.env.NEXT_PUBLIC_ZENTRIKA_URL ?? 'http://127.0.0.1:3100',
  },
].filter((p) => p.url);
