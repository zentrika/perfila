/** Listas de apoyo para el análisis ATS (español e inglés). Se comparan sin tildes y en minúsculas. */

export const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Títulos de sección que los ATS reconocen. */
export const SECTION_SYNONYMS: Record<'summary' | 'experience' | 'education' | 'skills' | 'languages' | 'certifications', string[]> = {
  summary: ['perfil', 'perfil profesional', 'resumen', 'resumen profesional', 'acerca de mi', 'sobre mi', 'objetivo', 'objetivo profesional', 'summary', 'professional summary', 'profile', 'about me', 'objective'],
  experience: ['experiencia', 'experiencia laboral', 'experiencia profesional', 'trayectoria profesional', 'historial laboral', 'experience', 'work experience', 'professional experience', 'employment history', 'work history'],
  education: ['educacion', 'formacion', 'formacion academica', 'estudios', 'educacion y formacion', 'education', 'academic background', 'education and training'],
  skills: ['habilidades', 'habilidades tecnicas', 'competencias', 'conocimientos', 'aptitudes', 'herramientas', 'skills', 'technical skills', 'core competencies', 'competencies', 'tools'],
  languages: ['idiomas', 'lenguas', 'languages'],
  certifications: ['certificaciones', 'certificados', 'cursos', 'certificaciones y cursos', 'licencias y certificaciones', 'certifications', 'licenses', 'courses', 'licenses and certifications'],
};

/** Raíces de verbos de acción frecuentes en logros (pasado y presente, español e inglés). */
export const ACTION_STEMS = [
  // español
  'desarroll', 'implement', 'disen', 'lider', 'coordin', 'gestion', 'optimic', 'optimiz', 'reduj', 'reduc', 'aument', 'mejor',
  'constru', 'automatic', 'automatiz', 'migr', 'integr', 'cre', 'lanc', 'lanz', 'logr', 'administr', 'analic', 'analiz', 'negoci',
  'supervis', 'capacit', 'elabor', 'planific', 'ejecut', 'document', 'mantuv', 'manten', 'resolv', 'entreg', 'gener', 'increment',
  'establec', 'dirig', 'organic', 'organiz', 'propus', 'propon', 'configur', 'despleg', 'despliego', 'refactor', 'monitor', 'escal',
  'ahorr', 'vend', 'atend', 'asesor', 'investig', 'program', 'valid', 'audit', 'form', 'conduj', 'conduc', 'defin', 'estandar',
  'impuls', 'consolid', 'transform', 'modern', 'simplific', 'acompan', 'mentor', 'contrat', 'recluto', 'reclut', 'factur', 'cerr',
  'gane', 'gano', 'obtuv', 'publiqu', 'public', 'present', 'redact', 'estructur', 'garantic', 'garantiz', 'aseg',
  // inglés
  'develop', 'built', 'build', 'led', 'lead', 'design', 'implement', 'manag', 'creat', 'improv', 'reduc', 'increas', 'launch',
  'deliver', 'optimiz', 'automat', 'migrat', 'integrat', 'architect', 'maintain', 'collaborat', 'drove', 'driv', 'own', 'ship',
  'scal', 'deploy', 'mentor', 'analyz', 'coordinat', 'resolv', 'wrote', 'writ', 'establish', 'spearhead', 'streamlin', 'cut',
  'grew', 'grow', 'generat', 'negotiat', 'train', 'supervis', 'plan', 'execut', 'document', 'achiev', 'won', 'sav', 'redesign',
];

/** Verbos débiles: no son errores, pero restan fuerza a un logro. */
export const WEAK_STARTS = ['responsable de', 'encargado de', 'encargada de', 'participe en', 'apoye en', 'ayude a', 'responsible for', 'helped', 'assisted', 'worked on', 'tasks included', 'funciones:'];

export const CLICHES = [
  'proactivo', 'proactiva', 'trabajo en equipo', 'orientado a resultados', 'orientada a resultados', 'apasionado', 'apasionada',
  'dinamico', 'dinamica', 'responsable', 'puntual', 'comprometido', 'comprometida', 'capacidad de trabajo bajo presion',
  'facilidad de aprendizaje', 'excelentes relaciones interpersonales', 'pensamiento fuera de la caja', 'revolucionari', 'sinergia',
  'team player', 'hard worker', 'self-motivated', 'results-driven', 'go-getter', 'think outside the box', 'detail-oriented', 'passionate',
];

/** Datos que no deben ir en una hoja de vida (discriminación y privacidad). */
export const SENSITIVE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b(c\.?\s?c\.?|cedula( de ciudadania)?|documento de identidad|dni|pasaporte|n[uú]mero de identificaci[oó]n)\b[^\n]{0,8}\d{6,}/i, label: 'número de documento de identidad' },
  { re: /\bfecha de nacimiento\b|\bdate of birth\b|\bnacid[oa] el\b/i, label: 'fecha de nacimiento' },
  { re: /\bestado civil\b|\bmarital status\b|\b(solter[oa]|casad[oa]|union libre|divorciad[oa])\b/i, label: 'estado civil' },
  { re: /\b\d{2}\s?años de edad\b|\bedad\s*:\s*\d{2}\b|\bage\s*:\s*\d{2}\b/i, label: 'edad' },
  { re: /\breligi[oó]n\b|\breligion\b/i, label: 'religión' },
  { re: /\blibreta militar\b|\bgrupo sangu[ií]neo\b|\brh\s*[:]?\s*[abo]{1,2}[+-]/i, label: 'libreta militar o grupo sanguíneo' },
];

export const STOPWORDS = new Set(
  norm(
    `a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella ellas ellos en entre era es esa esas ese eso esos esta estas este esto estos fue fueron ha han hasta hay la las le les lo los mas me mi mis muy nos o otra otro para pero poco por porque que quien se sea ser si sin sobre su sus tambien te tiene tienen todo todos tu un una uno unos y ya yo
    nuestro nuestra nuestros nuestras usted ustedes cada parte puede pueden debe deben sera seran asi bien tanto segun mientras ademas aqui alli
    empresa empresas trabajo trabajar buscamos busca requisitos requerimos ofrecemos oferta cargo vacante candidato candidata persona personas experiencia anos ano años minimo deseable plus conocimiento conocimientos manejo nivel area equipo equipos rol funciones responsabilidades tareas perfil profesional beneficios salario contrato tiempo completo medio lugar ciudad modalidad horario lunes viernes dias dia
    the a an and or of to in on for with by at from as is are be been being this that these those it its we you your our their they will would can could should must may might have has had do does did not no yes than then so such into about over under within across per via also more most other some any all each both
    trabajaras trabajar seras tendras haras apoyaras liderar buscas unete sumate formar parte senior junior semi semisenior ssr sr jr remoto presencial hibrido nuevo nueva gran buen buena excelente importante
    job role position company team teams candidate candidates looking seeking required requirements preferred plus experience years year strong ability skills skill knowledge work working including include includes responsibilities responsible duties benefits salary full time part remote hybrid office location opportunity join`,
  )
    .split(/\s+/)
    .filter(Boolean),
);

/** Términos de varias palabras que conviene detectar como una sola palabra clave. */
export const PHRASES = [
  'power bi', 'machine learning', 'deep learning', 'data science', 'ciencia de datos', 'analisis de datos', 'data analysis',
  'servicio al cliente', 'customer service', 'atencion al cliente', 'gestion de proyectos', 'project management', 'control de calidad',
  'quality assurance', 'cuentas por pagar', 'cuentas por cobrar', 'nomina', 'excel avanzado', 'google analytics', 'google ads',
  'seo', 'sem', 'rest api', 'api rest', 'apis rest', 'ci/cd', 'node.js', 'react native', 'spring boot', 'sql server', 'ms project',
  'scrum master', 'product owner', 'ux/ui', 'ui/ux', 'design thinking', 'cadena de suministro', 'supply chain', 'recursos humanos',
  'seguridad informatica', 'ciberseguridad', 'seguridad de la informacion', 'devops', 'cloud computing', 'microservicios', 'microservices',
  'aws', 'azure', 'google cloud', 'gcp', 'unit testing', 'pruebas unitarias', 'ingles avanzado', 'ingles intermedio', 'atencion de pacientes',
  'sap', 'salesforce', 'hubspot', 'tableau', 'looker', 'big data', 'business intelligence', 'inteligencia de negocios', 'kpi', 'okr',
];
