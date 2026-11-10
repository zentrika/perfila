import {
  ACTION_STEMS,
  CLICHES,
  PHRASES,
  SECTION_SYNONYMS,
  SENSITIVE_PATTERNS,
  STOPWORDS,
  WEAK_STARTS,
  norm,
} from './lexicon';

export type Status = 'pass' | 'warn' | 'fail';

export interface Check {
  id: string;
  title: string;
  status: Status;
  detail: string;
  fix?: string;
  weight?: number;
}

export interface Category {
  id: 'parse' | 'format' | 'contact' | 'structure' | 'content' | 'keywords';
  title: string;
  weight: number;
  checks: Check[];
  score: number;
}

export interface KeywordResult {
  found: string[];
  missing: string[];
  ratio: number;
}

export interface Report {
  score: number;
  grade: { label: string; tone: 'great' | 'good' | 'meh' | 'bad' };
  categories: Category[];
  keywords: KeywordResult | null;
  stats: { words: number; pages: number | null; bullets: number; quantified: number; sections: string[] };
}

export interface AnalyzeInput {
  text: string;
  source: 'pdf' | 'docx' | 'txt' | 'editor';
  fileName?: string;
  fileSize?: number;
  pages?: number | null;
  images?: number;
  multiColumn?: boolean;
  tables?: number;
  textBoxes?: number;
  fonts?: string[];
  undecodable?: number;
  encrypted?: boolean;
  headerFooterText?: string;
  jobDescription?: string;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const LINKEDIN = /linkedin\.com\/in\/[A-Za-z0-9_%-]+/i;
const BULLET = /^\s*(?:[•▪●◦○■□►▸✓✔➢➤·]\s*|(?:[-–—*]|\d{1,2}[.)])\s+)/;
const PUA = /[-]/g;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const PLACES =
  /\b(colombia|mexico|méxico|argentina|chile|peru|perú|ecuador|venezuela|espana|españa|spain|estados unidos|usa|united states|panama|panamá|costa rica|uruguay|paraguay|bolivia|guatemala|honduras|el salvador|nicaragua|republica dominicana|república dominicana|puerto rico|brasil|brazil|canada|canadá|bogota|bogotá|medellin|medellín|cali|barranquilla|cartagena|bucaramanga|monteria|montería|pereira|manizales|cucuta|cúcuta|ibague|ibagué|santa marta|villavicencio|pasto|neiva|armenia|popayan|popayán|sincelejo|valledupar|tunja|cdmx|guadalajara|monterrey|lima|quito|santiago|buenos aires|madrid|barcelona|remoto|remote)\b/i;

function phones(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}/g)) {
    const raw = m[0].trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) continue;
    if (/^(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}$/.test(raw)) continue; // rango de años
    if (/^(19|20)\d{2}$/.test(digits.slice(0, 4)) && digits.length === 8 && !raw.startsWith('+')) continue;
    out.push(raw);
  }
  return out;
}

function findSections(lines: string[]): Map<string, number> {
  const found = new Map<string, number>();
  lines.forEach((line, i) => {
    const n = norm(line).replace(/[:•|\-–—]+$/g, '').replace(/^[•\-–—\s]+/, '').trim();
    if (!n || n.split(/\s+/).length > 5) return;
    for (const [key, syns] of Object.entries(SECTION_SYNONYMS)) {
      if (found.has(key)) continue;
      if (syns.some((s) => n === s || n.startsWith(`${s} `) || n.startsWith(`${s}:`))) found.set(key, i);
    }
  });
  return found;
}

const statusScore = (s: Status) => (s === 'pass' ? 1 : s === 'warn' ? 0.5 : 0);

function categoryScore(checks: Check[]): number {
  const total = checks.reduce((n, c) => n + (c.weight ?? 1), 0);
  if (!total) return 1;
  return checks.reduce((n, c) => n + statusScore(c.status) * (c.weight ?? 1), 0) / total;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

export function extractKeywords(jd: string, max = 22): string[] {
  const n = norm(jd);
  const phrases = PHRASES.filter((p) => new RegExp(`(^|[^a-z0-9])${escapeRe(p)}($|[^a-z0-9])`).test(n));
  const caps = new Set<string>();
  for (const m of jd.matchAll(/\b([A-Z][A-Za-z0-9+#.]{1,}|[A-Z]{2,}[0-9]*)\b/g)) caps.add(norm(m[1]));
  const freq = new Map<string, number>();
  for (const m of n.matchAll(/[a-z0-9][a-z0-9+#./-]*[a-z0-9+#]|[a-z]{2,}/g)) {
    const t = m[0].replace(/[./-]+$/, '');
    if (t.length < 3 && !['go', 'c#', 'r', 'ux', 'ui', 'qa', 'bi', 'ml', 'ai', 'ia'].includes(t)) continue;
    if (STOPWORDS.has(t) || /^\d+$/.test(t)) continue;
    if (phrases.some((p) => p.split(' ').includes(t))) continue;
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const scored = [...freq.entries()]
    .map(([t, f]) => ({ t, s: f + (caps.has(t) ? 1.5 : 0) + (/[+#./]/.test(t) ? 1 : 0) }))
    .filter((x) => x.s >= 1.5 || freq.size < 25)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
  const out: string[] = [];
  for (const k of [...phrases, ...scored]) {
    if (out.length >= max) break;
    // Evita duplicados por plural simple («proyecto» / «proyectos»).
    if (out.some((o) => o === k || o === k.replace(/e?s$/, '') || k === o.replace(/e?s$/, ''))) continue;
    out.push(k);
  }
  return out;
}

export function matchKeywords(cvText: string, keywords: string[]): KeywordResult {
  const n = norm(cvText);
  const found: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    const forms = [k, k.replace(/e?s$/, ''), `${k}s`];
    const ok = forms.some((f) => f.length >= 2 && new RegExp(`(^|[^a-z0-9])${escapeRe(f)}($|[^a-z0-9])`).test(n));
    (ok ? found : missing).push(k);
  }
  return { found, missing, ratio: keywords.length ? found.length / keywords.length : 0 };
}

export function analyze(input: AnalyzeInput): Report {
  const text = input.text.replace(/\r/g, '');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const nText = norm(text);
  const words = text.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]/.test(w)).length;
  const chars = text.replace(/\s/g, '').length;
  const isFile = input.source !== 'editor';
  const categories: Category[] = [];

  // ── 1. Lectura del archivo ──────────────────────────────────────────────
  if (isFile) {
    const c: Check[] = [];
    if (input.encrypted) {
      c.push({
        id: 'encrypted',
        title: 'PDF sin protección',
        status: 'fail',
        weight: 3,
        detail: 'El PDF está protegido o cifrado. Muchos ATS no pueden abrirlo.',
        fix: 'Expórtalo de nuevo sin contraseña ni restricciones de copia.',
      });
    }
    c.push(
      chars < 200
        ? {
            id: 'text',
            title: 'Texto seleccionable',
            status: 'fail',
            weight: 3,
            detail: `Solo se pudieron leer ${chars} caracteres. Parece una imagen, un escaneo o texto convertido en curvas.`,
            fix: 'Crea el CV en un editor de texto (o en Perfila) y expórtalo como PDF con texto real.',
          }
        : chars < 700
          ? {
              id: 'text',
              title: 'Texto seleccionable',
              status: 'warn',
              weight: 3,
              detail: `Se leyó poco texto (${chars} caracteres). Puede que parte del contenido esté en imágenes.`,
              fix: 'Revisa en «Así lo lee el ATS» qué partes faltan.',
            }
          : { id: 'text', title: 'Texto seleccionable', status: 'pass', weight: 3, detail: `Se leyeron ${words} palabras sin problema.` },
    );
    const pua = (text.match(PUA) ?? []).length + (text.match(/�/g) ?? []).length + (input.undecodable ?? 0);
    const ratio = pua / Math.max(1, chars + (input.undecodable ?? 0));
    const glued = text.split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]{22,}$/.test(w)).length;
    // «E X P E R I E N C I A»: letras separadas por espaciado excesivo entre caracteres.
    const spaced = (text.match(/(?:^|\s)(?:[A-Za-zÀ-ÿ] ){4,}[A-Za-zÀ-ÿ](?=\s|$)/gm) ?? []).length;
    c.push(
      ratio > 0.05
        ? {
            id: 'garbled',
            title: 'Caracteres legibles',
            status: 'fail',
            weight: 2,
            detail: `${Math.round(ratio * 100)} % de los caracteres no se pueden convertir en letras: la fuente no trae su mapa Unicode.`,
            fix: 'Usa una fuente estándar (Arial, Calibri, Inter, Georgia) y vuelve a exportar.',
          }
        : ratio > 0.01 || glued > 3 || spaced > 0
          ? {
              id: 'garbled',
              title: 'Caracteres legibles',
              status: 'warn',
              weight: 2,
              detail:
                spaced > 0
                  ? `Hay ${spaced} palabra(s) con las letras separadas (por ejemplo «E X P E R I E N C I A»): el espaciado entre letras es tan grande que el ATS las lee sueltas.`
                  : glued > 3
                    ? `Hay ${glued} palabras pegadas entre sí: el ATS podría no reconocerlas.`
                    : 'Algunos caracteres no se pudieron leer (posibles íconos o símbolos de una fuente especial).',
              fix: 'Quita el espaciado entre letras de los títulos y evita texto justificado con espacios extremos o fuentes decorativas.',
            }
          : { id: 'garbled', title: 'Caracteres legibles', status: 'pass', weight: 2, detail: 'Todas las letras se leen correctamente.' },
    );
    if (input.source === 'pdf' || (input.source === 'docx' && input.multiColumn)) {
      c.push(
        input.multiColumn
          ? {
              id: 'columns',
              title: 'Diseño de una columna',
              status: 'fail',
              weight: 3,
              detail: 'Detecté dos columnas. El ATS lee de izquierda a derecha y mezcla las líneas de ambas (revisa el texto extraído).',
              fix: 'Pasa todo a una sola columna: la barra lateral (habilidades, idiomas, contacto) va como secciones normales.',
            }
          : { id: 'columns', title: 'Diseño de una columna', status: 'pass', weight: 3, detail: 'El contenido sigue un solo orden de lectura.' },
      );
    }
    if (input.source === 'docx') {
      const tb = input.textBoxes ?? 0;
      const tables = input.tables ?? 0;
      c.push(
        tb > 0
          ? {
              id: 'textboxes',
              title: 'Sin cuadros de texto',
              status: 'fail',
              weight: 2,
              detail: `Hay ${tb} cuadro(s) de texto. Muchos ATS ignoran su contenido por completo.`,
              fix: 'Mueve ese texto al cuerpo del documento.',
            }
          : { id: 'textboxes', title: 'Sin cuadros de texto', status: 'pass', weight: 2, detail: 'Todo el texto está en el cuerpo del documento.' },
      );
      c.push(
        tables > 0
          ? {
              id: 'tables',
              title: 'Sin tablas de diseño',
              status: 'warn',
              detail: `Hay ${tables} tabla(s). Algunos ATS leen las celdas en desorden.`,
              fix: 'Usa párrafos y tabulaciones en lugar de tablas para alinear fechas.',
            }
          : { id: 'tables', title: 'Sin tablas de diseño', status: 'pass', detail: 'No hay tablas.' },
      );
      const hf = input.headerFooterText ?? '';
      if (EMAIL.test(hf) || phones(hf).length) {
        c.push({
          id: 'headerfooter',
          title: 'Contacto en el cuerpo',
          status: 'warn',
          detail: 'Tus datos de contacto están en el encabezado o pie de página, y varios ATS no leen esas zonas.',
          fix: 'Pon nombre, correo y teléfono en las primeras líneas del cuerpo.',
        });
      }
    }
    const imgs = input.images ?? 0;
    c.push(
      imgs > 0
        ? {
            id: 'images',
            title: 'Sin fotos ni gráficos',
            status: 'warn',
            detail: `Hay ${imgs} imagen(es): foto, íconos, logos o barras de nivel. El ATS no las lee y lo que digan se pierde.`,
            fix: 'Quita la foto y reemplaza barras o íconos por texto (por ejemplo, «Inglés: B2»).',
          }
        : { id: 'images', title: 'Sin fotos ni gráficos', status: 'pass', detail: 'No hay imágenes que oculten información.' },
    );
    const icons = (text.match(EMOJI) ?? []).length + (text.match(PUA) ?? []).length;
    if (icons > 0) {
      c.push({
        id: 'icons',
        title: 'Sin íconos ni emojis',
        status: 'warn',
        detail: `Hay ${icons} ícono(s) o emoji(s) en el texto. El ATS los convierte en símbolos sin sentido.`,
        fix: 'Escribe «Correo:», «Teléfono:» o «LinkedIn:» en lugar de íconos.',
      });
    }
    categories.push({ id: 'parse', title: 'Lectura del archivo', weight: 30, checks: c, score: categoryScore(c) });
  }

  // ── 2. Formato del archivo ──────────────────────────────────────────────
  if (isFile) {
    const c: Check[] = [];
    c.push(
      input.source === 'txt'
        ? {
            id: 'type',
            title: 'Tipo de archivo',
            status: 'warn',
            detail: 'Un .txt se lee bien, pero los portales y reclutadores esperan PDF o DOCX.',
            fix: 'Envía PDF (con texto real) o DOCX, salvo que la oferta pida otra cosa.',
          }
        : { id: 'type', title: 'Tipo de archivo', status: 'pass', detail: `${input.source.toUpperCase()} es un formato aceptado por los ATS.` },
    );
    const size = input.fileSize ?? 0;
    c.push(
      size > 5 * 1024 * 1024
        ? { id: 'size', title: 'Tamaño del archivo', status: 'fail', detail: `Pesa ${(size / 1048576).toFixed(1)} MB. Muchos portales rechazan archivos de más de 5 MB.`, fix: 'Quita imágenes y exporta de nuevo.' }
        : size > 2 * 1024 * 1024
          ? { id: 'size', title: 'Tamaño del archivo', status: 'warn', detail: `Pesa ${(size / 1048576).toFixed(1)} MB. Lo ideal es menos de 2 MB.`, fix: 'Comprime o quita imágenes.' }
          : { id: 'size', title: 'Tamaño del archivo', status: 'pass', detail: `Pesa ${Math.max(1, Math.round(size / 1024))} KB.` },
    );
    const fname = (input.fileName ?? '').replace(/\.[^.]+$/, '');
    const generic = /^(cv|hv|hoja[\s_-]*de[\s_-]*vida|curriculum|curr[ií]culum[\s_-]*vitae|resume|resumen|documento?|document|untitled|sin[\s_-]*t[ií]tulo|scan|img|image|whatsapp|archivo)\b/i.test(fname);
    const messy = /\(\d+\)|copia|copy|final|v\d\b|_\d{3,}|\d{5,}/i.test(fname);
    c.push(
      generic || messy || !/[A-Za-z]{3,}/.test(fname)
        ? {
            id: 'filename',
            title: 'Nombre del archivo',
            status: 'warn',
            detail: `«${input.fileName}» no dice de quién es${messy ? ' o tiene marcas de versión' : ''}. El reclutador lo guarda junto a cientos de archivos.`,
            fix: 'Nómbralo Nombre_Apellido_CV.pdf, sin espacios, tildes ni números de versión.',
          }
        : { id: 'filename', title: 'Nombre del archivo', status: 'pass', detail: `«${input.fileName}» identifica bien el documento.` },
    );
    if (input.pages != null) {
      const p = input.pages;
      c.push(
        p > 3
          ? { id: 'pages', title: 'Extensión', status: 'fail', weight: 2, detail: `Tiene ${p} páginas. Para casi todos los cargos, 1 o 2 bastan.`, fix: 'Deja solo lo de los últimos 10 años y lo relevante para la oferta.' }
          : p === 3
            ? { id: 'pages', title: 'Extensión', status: 'warn', detail: 'Tiene 3 páginas. Salvo perfiles académicos o muy senior, intenta dejarlo en 2.', fix: 'Recorta descripciones largas y experiencias antiguas.' }
            : { id: 'pages', title: 'Extensión', status: 'pass', detail: `${p} ${p === 1 ? 'página' : 'páginas'}: una extensión adecuada.` },
      );
    }
    const fonts = (input.fonts ?? []).filter((f) => !/symbol|dingbat|wingding/i.test(f));
    if (fonts.length) {
      c.push(
        fonts.length > 3
          ? { id: 'fonts', title: 'Tipografías', status: 'warn', detail: `Usa ${fonts.length} familias tipográficas (${fonts.slice(0, 5).join(', ')}).`, fix: 'Usa una o dos familias estándar.' }
          : { id: 'fonts', title: 'Tipografías', status: 'pass', detail: `Familias: ${fonts.join(', ')}.` },
      );
    }
    categories.push({ id: 'format', title: 'Formato del archivo', weight: 10, checks: c, score: categoryScore(c) });
  }

  // ── 3. Contacto ─────────────────────────────────────────────────────────
  {
    const c: Check[] = [];
    const email = EMAIL.exec(text)?.[0];
    c.push(
      email
        ? { id: 'email', title: 'Correo electrónico', status: 'pass', weight: 2, detail: email }
        : { id: 'email', title: 'Correo electrónico', status: 'fail', weight: 2, detail: 'No encontré un correo electrónico.', fix: 'Agrega un correo profesional (nombre.apellido@…).' },
    );
    const ph = phones(text)[0];
    c.push(
      ph
        ? { id: 'phone', title: 'Teléfono', status: 'pass', detail: ph }
        : { id: 'phone', title: 'Teléfono', status: 'fail', detail: 'No encontré un número de teléfono.', fix: 'Agrega tu celular con indicativo, por ejemplo +57 300 123 4567.' },
    );
    const li = LINKEDIN.exec(text)?.[0];
    c.push(
      li
        ? { id: 'linkedin', title: 'Perfil de LinkedIn', status: 'pass', detail: li }
        : {
            id: 'linkedin',
            title: 'Perfil de LinkedIn',
            status: 'warn',
            detail: /linkedin/i.test(text) ? 'Dice «LinkedIn» pero sin la dirección: el ATS no lee hipervínculos ocultos.' : 'No encontré la URL de tu perfil de LinkedIn.',
            fix: 'Escribe la dirección completa: linkedin.com/in/tu-usuario.',
          },
    );
    c.push(
      PLACES.test(text)
        ? { id: 'location', title: 'Ubicación', status: 'pass', detail: 'Incluye ciudad o país.' }
        : { id: 'location', title: 'Ubicación', status: 'warn', detail: 'No identifiqué tu ciudad o país. Los reclutadores filtran por ubicación.', fix: 'Agrega «Ciudad, País» (o «Remoto» si aplica).' },
    );
    categories.push({ id: 'contact', title: 'Datos de contacto', weight: 15, checks: c, score: categoryScore(c) });
  }

  // ── 4. Estructura ───────────────────────────────────────────────────────
  const sections = findSections(lines);
  {
    const c: Check[] = [];
    const req: [keyof typeof SECTION_SYNONYMS, string, Status][] = [
      ['experience', 'Experiencia laboral', 'fail'],
      ['education', 'Educación', 'fail'],
      ['skills', 'Habilidades', 'fail'],
      ['summary', 'Perfil profesional', 'warn'],
      ['languages', 'Idiomas', 'warn'],
    ];
    for (const [key, label, missing] of req) {
      c.push(
        sections.has(key)
          ? { id: `sec-${key}`, title: `Sección «${label}»`, status: 'pass', weight: missing === 'fail' ? 2 : 1, detail: `Encontrada como «${lines[sections.get(key)!]}».` }
          : {
              id: `sec-${key}`,
              title: `Sección «${label}»`,
              status: missing,
              weight: missing === 'fail' ? 2 : 1,
              detail: `No encontré un título reconocible para ${label.toLowerCase()}.`,
              fix: `Usa un título estándar, por ejemplo «${label}». Evita nombres creativos como «Mi trayectoria».`,
            },
      );
    }

    const monthNames = /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|jan|apr|aug|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+(de\s+)?(19|20)\d{2}\b/gi;
    const numeric = /\b(0?[1-9]|1[0-2])[/.-](19|20)\d{2}\b/g;
    const nMonth = (nText.match(monthNames) ?? []).length;
    const nNum = (text.match(numeric) ?? []).length;
    const nYears = (text.match(/\b(19|20)\d{2}\b/g) ?? []).length;
    c.push(
      nYears < 2
        ? { id: 'dates', title: 'Fechas', status: 'warn', detail: 'Casi no hay fechas. El ATS calcula tus años de experiencia con ellas.', fix: 'Pon mes y año de inicio y fin en cada cargo y estudio.' }
        : nMonth > 0 && nNum > 0
          ? { id: 'dates', title: 'Fechas', status: 'warn', detail: `Mezclas formatos de fecha (${nMonth} con nombre de mes y ${nNum} numéricas).`, fix: 'Usa un solo formato en todo el documento, por ejemplo «sept. 2022 – actualidad».' }
          : nMonth + nNum === 0
            ? { id: 'dates', title: 'Fechas', status: 'warn', detail: 'Las fechas solo tienen año. Con el mes, el ATS calcula mejor tu experiencia.', fix: 'Usa «mes año» (por ejemplo «sept. 2022»).' }
            : { id: 'dates', title: 'Fechas', status: 'pass', detail: 'Las fechas tienen mes y año, en un formato consistente.' },
    );

    // Orden cronológico inverso dentro de Experiencia
    if (sections.has('experience')) {
      const start = sections.get('experience')!;
      const others = [...sections.values()].filter((i) => i > start).sort((a, b) => a - b);
      const block = lines.slice(start + 1, others[0] ?? lines.length).join('\n');
      const starts = [...block.matchAll(/((?:19|20)\d{2})\s*[-–—]\s*(?:[A-Za-zÁÉÍÓÚáéíóú.]+\s+)?(?:(?:19|20)\d{2}|actual|actualidad|presente|present|hoy|current)/gi)].map((m) => Number(m[1]));
      const inverted = starts.some((y, i) => i > 0 && y > starts[i - 1] + 0);
      if (starts.length >= 2) {
        c.push(
          inverted
            ? { id: 'order', title: 'Orden cronológico', status: 'warn', detail: 'La experiencia no va de la más reciente a la más antigua.', fix: 'Ordena los cargos del más reciente al más antiguo.' }
            : { id: 'order', title: 'Orden cronológico', status: 'pass', detail: 'La experiencia va de la más reciente a la más antigua.' },
        );
      }
    }
    categories.push({ id: 'structure', title: 'Estructura', weight: 20, checks: c, score: categoryScore(c) });
  }

  // ── 5. Contenido ────────────────────────────────────────────────────────
  const bulletLines = lines.filter((l) => BULLET.test(l));
  const quantifiedLines = lines.filter((l) => {
    const s = l.replace(/\b(19|20)\d{2}\b/g, '').replace(/\+?\d[\d\s().-]{8,}\d/g, '');
    return /\d+([.,]\d+)?\s?%|[$€]\s?\d|\b\d+([.,]\d+)?\s?(k|m|mm|mil|millones|usd|cop|horas|h|min|minutos|d[ií]as|semanas|meses|clientes|usuarios|personas|proyectos|empleados|ventas|activos|tableros|x)\b|\b\d{2,}\b/i.test(s);
  });
  {
    const c: Check[] = [];
    c.push(
      words < 150
        ? { id: 'length', title: 'Cantidad de contenido', status: 'fail', detail: `Solo ${words} palabras: muy poco para que el ATS te encuentre por palabras clave.`, fix: 'Describe logros concretos en cada cargo (3 a 6 viñetas).' }
        : words < 300
          ? { id: 'length', title: 'Cantidad de contenido', status: 'warn', detail: `${words} palabras: un poco corto.`, fix: 'Agrega logros y habilidades relacionadas con la oferta.' }
          : words > 1200
            ? { id: 'length', title: 'Cantidad de contenido', status: 'warn', detail: `${words} palabras: demasiado largo para leerlo en 30 segundos.`, fix: 'Resume. Quita párrafos narrativos y experiencias antiguas o irrelevantes.' }
            : { id: 'length', title: 'Cantidad de contenido', status: 'pass', detail: `${words} palabras: una extensión cómoda.` },
    );
    c.push(
      bulletLines.length >= 4
        ? { id: 'bullets', title: 'Logros en viñetas', status: 'pass', detail: `${bulletLines.length} viñetas: fáciles de leer para personas y ATS.` }
        : { id: 'bullets', title: 'Logros en viñetas', status: 'warn', detail: bulletLines.length ? `Solo ${bulletLines.length} viñetas.` : 'No hay viñetas: la experiencia parece escrita en párrafos.', fix: 'Escribe cada logro en una viñeta corta que empiece con un verbo.' },
    );
    const candidates = bulletLines.length ? bulletLines : lines.filter((l) => l.split(/\s+/).length >= 7);
    const action = candidates.filter((l) => {
      const first = norm(l.replace(BULLET, '')).split(/[^a-z]+/).filter(Boolean)[0] ?? '';
      return first.length >= 3 && ACTION_STEMS.some((s) => first.startsWith(s));
    }).length;
    const actionRatio = candidates.length ? action / candidates.length : 0;
    c.push(
      actionRatio >= 0.55
        ? { id: 'verbs', title: 'Verbos de acción', status: 'pass', detail: `${action} de ${candidates.length} logros empiezan con un verbo de acción.` }
        : {
            id: 'verbs',
            title: 'Verbos de acción',
            status: 'warn',
            detail: `Solo ${action} de ${candidates.length} líneas empiezan con un verbo de acción.`,
            fix: 'Empieza cada logro con verbos como desarrollé, lideré, reduje, automaticé o implementé.',
          },
    );
    c.push(
      quantifiedLines.length >= 3
        ? { id: 'numbers', title: 'Logros cuantificados', status: 'pass', detail: `${quantifiedLines.length} líneas con cifras (%, montos, cantidades o tiempos).` }
        : {
            id: 'numbers',
            title: 'Logros cuantificados',
            status: 'warn',
            detail: quantifiedLines.length ? `Solo ${quantifiedLines.length} línea(s) con cifras.` : 'Ningún logro tiene cifras.',
            fix: 'Agrega magnitudes reales: cuántos usuarios, cuánto tiempo ahorraste, cuántas personas, qué porcentaje.',
          },
    );
    const firstPerson = (text.match(/\b(yo|conmigo)\b/gi) ?? []).length + (text.match(/\b(I|my)\b/g) ?? []).length + (nText.match(/\b(soy un|soy una|me desempene|me considero|mi experiencia|mi objetivo)\b/g) ?? []).length;
    c.push(
      firstPerson > 2
        ? { id: 'person', title: 'Redacción impersonal', status: 'warn', detail: `Hay ${firstPerson} expresiones en primera persona («yo», «soy un…», «mi experiencia…»).`, fix: 'Escribe en estilo directo: «Desarrollé…» en lugar de «Yo desarrollé…».' }
        : { id: 'person', title: 'Redacción impersonal', status: 'pass', detail: 'Estilo directo, sin abusar de la primera persona.' },
    );
    const sensitive = SENSITIVE_PATTERNS.filter((p) => p.re.test(text) || p.re.test(nText)).map((p) => p.label);
    c.push(
      sensitive.length
        ? { id: 'sensitive', title: 'Datos personales innecesarios', status: 'warn', detail: `Incluye ${sensitive.join(', ')}.`, fix: 'Quítalos: no aportan para la selección y exponen datos sensibles. Se entregan solo si la empresa los pide al contratar.' }
        : { id: 'sensitive', title: 'Datos personales innecesarios', status: 'pass', detail: 'No incluye cédula, edad, estado civil ni otros datos sensibles.' },
    );
    const cliches = CLICHES.filter((cl) => nText.includes(cl));
    c.push(
      cliches.length >= 3
        ? { id: 'cliches', title: 'Frases genéricas', status: 'warn', detail: `Usa frases que no diferencian: ${cliches.slice(0, 5).map((x) => `«${x}»`).join(', ')}.`, fix: 'Cambia adjetivos por pruebas: en lugar de «proactivo», cuenta qué iniciaste y qué resultó.' }
        : { id: 'cliches', title: 'Frases genéricas', status: 'pass', detail: cliches.length ? `Pocas frases genéricas (${cliches.join(', ')}).` : 'Sin frases de relleno.' },
    );
    const weak = lines.filter((l) => WEAK_STARTS.some((w) => norm(l.replace(BULLET, '')).startsWith(w))).length;
    if (weak >= 2) {
      c.push({ id: 'weak', title: 'Logros frente a funciones', status: 'warn', detail: `${weak} líneas describen funciones («responsable de…», «encargado de…») en lugar de resultados.`, fix: 'Reescribe: qué hiciste, cómo y qué cambió gracias a eso.' });
    }
    categories.push({ id: 'content', title: 'Contenido', weight: 25, checks: c, score: categoryScore(c) });
  }

  // ── 6. Palabras clave de la oferta ──────────────────────────────────────
  let keywords: KeywordResult | null = null;
  const jd = (input.jobDescription ?? '').trim();
  if (jd.length >= 40) {
    const list = extractKeywords(jd);
    if (list.length >= 3) {
      keywords = matchKeywords(text, list);
      const pct = Math.round(keywords.ratio * 100);
      const check: Check =
        keywords.ratio >= 0.7
          ? { id: 'kw', title: 'Coincidencia con la oferta', status: 'pass', detail: `${pct} % de las palabras clave de la oferta aparecen en tu CV.` }
          : keywords.ratio >= 0.45
            ? { id: 'kw', title: 'Coincidencia con la oferta', status: 'warn', detail: `${pct} % de coincidencia. Te faltan términos que el ATS probablemente filtra.`, fix: 'Incluye las palabras que faltan donde sean verdad: en el perfil, las habilidades y los logros.' }
            : { id: 'kw', title: 'Coincidencia con la oferta', status: 'fail', detail: `Solo ${pct} % de coincidencia con la oferta.`, fix: 'Adapta el CV a esta oferta: usa los mismos términos que el aviso para tus habilidades reales.' };
      categories.push({ id: 'keywords', title: 'Palabras clave de la oferta', weight: 25, checks: [check], score: keywords.ratio });
    }
  }

  const totalW = categories.reduce((n, c) => n + c.weight, 0);
  let score = Math.round((categories.reduce((n, c) => n + c.score * c.weight, 0) / totalW) * 100);
  if (isFile && (chars < 200 || input.encrypted)) score = Math.min(score, 20);
  // Dos columnas desordenan todo lo demás que lee el ATS: el puntaje no puede ser «bueno».
  if (isFile && input.multiColumn) score = Math.min(score, 65);

  const grade =
    score >= 85
      ? { label: 'Excelente', tone: 'great' as const }
      : score >= 70
        ? { label: 'Bueno', tone: 'good' as const }
        : score >= 50
          ? { label: 'Mejorable', tone: 'meh' as const }
          : { label: 'En riesgo', tone: 'bad' as const };

  return {
    score,
    grade,
    categories,
    keywords,
    stats: {
      words,
      pages: input.pages ?? null,
      bullets: bulletLines.length,
      quantified: quantifiedLines.length,
      sections: [...sections.keys()],
    },
  };
}
