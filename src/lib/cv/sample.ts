import { defaultSettings, uid } from './defaults';
import type { CvData } from './types';

/** Datos de ejemplo de una persona ficticia, para conocer el editor y las plantillas. */
export function sampleCv(): CvData {
  return {
    schema: 1,
    personal: {
      fullName: 'Valentina Ríos Mejía',
      headline: 'Analista de Datos · SQL · Python · Power BI',
      email: 'valentina.rios@correo.com',
      phone: '+57 300 123 4567',
      city: 'Medellín',
      country: 'Colombia',
      linkedin: 'linkedin.com/in/valentina-rios-ejemplo',
      website: 'github.com/valentina-ejemplo',
    },
    summary:
      'Analista de datos con 4 años de experiencia convirtiendo datos de ventas y operaciones en decisiones. Construyo modelos en SQL y Python, tableros en Power BI y procesos ETL automatizados. Me enfoco en indicadores que el negocio entiende y en datos confiables.',
    experience: [
      {
        id: uid(),
        role: 'Analista de Datos',
        company: 'Comercializadora Andina S.A.S.',
        location: 'Medellín, Colombia',
        mode: 'hibrido',
        start: '2023-02',
        end: '',
        current: true,
        highlights: [
          'Automaticé el reporte semanal de ventas con Python y SQL, y reduje su preparación de 6 horas a 20 minutos.',
          'Diseñé 12 tableros en Power BI que usan 80 personas de las áreas comercial y de logística.',
          'Construí un modelo de pronóstico de demanda que bajó el inventario inmovilizado un 15 %.',
        ],
      },
      {
        id: uid(),
        role: 'Analista de Inteligencia de Negocios Junior',
        company: 'Logística del Valle',
        location: 'Cali, Colombia',
        mode: 'presencial',
        start: '2021-06',
        end: '2023-01',
        current: false,
        highlights: [
          'Mantuve el almacén de datos en PostgreSQL y documenté 40 tablas del modelo de operaciones.',
          'Creé alertas de entregas tardías que ayudaron a subir el cumplimiento del 88 % al 94 %.',
        ],
      },
    ],
    education: [
      {
        id: uid(),
        degree: 'Ingeniería Industrial',
        institution: 'Universidad de Antioquia',
        location: 'Medellín',
        start: '2016-02',
        end: '2021-05',
        current: false,
        details: '',
      },
    ],
    skills: [
      { id: uid(), name: 'Análisis y lenguajes', items: ['SQL', 'Python', 'Pandas', 'Estadística'] },
      { id: uid(), name: 'Visualización', items: ['Power BI', 'DAX', 'Excel avanzado', 'Looker Studio'] },
      { id: uid(), name: 'Datos', items: ['PostgreSQL', 'ETL', 'dbt', 'Git'] },
    ],
    certifications: [
      { id: uid(), name: 'Microsoft Certified: Power BI Data Analyst Associate', issuer: 'Microsoft', date: '2024-03', url: '' },
    ],
    projects: [
      {
        id: uid(),
        name: 'Tablero de movilidad de Medellín',
        description: 'Análisis público de viajes en bicicleta compartida con datos abiertos.',
        tech: 'Python, Pandas, Power BI',
        url: '',
      },
    ],
    languages: [
      { id: uid(), name: 'Español', level: 'nativo' },
      { id: uid(), name: 'Inglés', level: 'B2' },
    ],
    settings: defaultSettings(),
  };
}
