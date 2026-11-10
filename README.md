# Perfila — by ZENTRIKA

Generador de hojas de vida compatibles con ATS y analizador de CV. *Hojas de vida que los ATS leen y los reclutadores recuerdan.*

**Úsalo gratis:** https://perfila-zentrika.vercel.app · **¿Ideas o errores?** [Abre un issue](https://github.com/zentrika/perfila/issues): toda sugerencia es bienvenida.

* **Stack:** Next.js 15 (App Router) y TypeScript, sin dependencias de UI de terceros. Es el mismo stack de Zentrika.com.
* **Sin backend ni base de datos:** todo ocurre en el navegador. La hoja de vida se guarda en `localStorage` con autoguardado, así que sobrevive a recargas y cierres de pestaña. Los archivos que se analizan nunca salen del equipo.
* **Diseño:** copia versionada del design system de ZentrikaOS en `src/design-system/`. No se edita aquí (ver su README).
* **Región:** es-CO; papel Carta por defecto, con opción A4.

> Perfila es independiente de Órbita, ZentrikaOS y Zentrika.com: no comparte código, base de datos ni puertos. Se enlaza con ellos por URL (pie de página) y comparte la marca y el design system.

## Funciones

### Crear hoja de vida (`/crear`)

* **Formulario guiado en 9 pasos:**
  1. Datos personales
  2. Perfil
  3. Experiencia
  4. Educación
  5. Habilidades
  6. Certificaciones y proyectos
  7. Idiomas
  8. Plantilla y diseño
  9. Revisar y descargar

  Cada paso trae un consejo ATS, y el avance se marca por secciones.
* **Vista previa en vivo** a tamaño real. Simula los saltos de página igual que la impresión y cuenta las páginas.
* **Saltos de página cuidados:** ninguna entrada se parte, un título nunca queda solo al final de una página y las secciones cortas (todas menos Experiencia) se mantienen enteras.
* **Ayudas de redacción:** contador de palabras en el perfil, y en cada logro un indicador de verbo de acción, de cifras y de longitud.
* **7 plantillas ATS:** Moderna, Técnica, Elegante, Contraste, Clásica, Ejecutiva y Mínima. Todas comparten el mismo HTML semántico y solo cambia el CSS.
* **Ajustes:**
  * Color de acento
  * Idioma de los títulos (español o inglés)
  * Papel Carta o A4
  * Formato de fechas
  * Tipografía: la de la plantilla, Arial, Calibri, Aptos, Georgia o Cambria (Calibri, Aptos y Cambria vienen con Office; si faltan, el PDF sale en Arial)
  * Tamaño de letra
  * Orden y visibilidad de las secciones
* **Exportación:**
  * **PDF:** se genera con la impresión del navegador y lleva texto real. El nombre sugerido es `Nombre_Apellido_CV.pdf`.
  * **DOCX:** se genera sin dependencias y usa estilos de título y viñetas nativas de Word.
  * **TXT:** para pegar en formularios de empleo. También hay un botón para copiar el texto.
* **Respaldo JSON:** exporta e importa la hoja de vida para llevarla a otro navegador. Los datos importados se validan y se recortan campo por campo.
* **Revisión ATS del propio contenido**, con las mismas reglas del analizador y comparación opcional con una oferta.

### Analizar CV (`/analizar`)

* Admite **PDF, DOCX o TXT**, que puedes arrastrar o elegir. Se lee en el navegador con un extractor propio (`src/lib/files/`):
  * **PDF:** objetos y flujos de objetos, FlateDecode, fuentes con `ToUnicode`, codificaciones WinAnsi y `/Differences`, anchos AFM de las fuentes estándar, posición del texto y reconstrucción de líneas por coordenadas.
  * **DOCX:** lector ZIP propio; detecta tablas, cuadros de texto, imágenes, columnas y datos de contacto en el encabezado o el pie.
* **Puntaje de 0 a 100** en cinco categorías: lectura del archivo (30 %), formato (10 %), contacto (15 %), estructura (20 %) y contenido (25 %). Con una oferta pegada se suma la coincidencia de palabras clave (25 %).
* **Lo que se revisa:**
  * Texto seleccionable o escaneado, y glifos que no se pueden leer
  * Diseño en dos columnas
  * Imágenes, íconos y emojis
  * Tamaño, nombre del archivo, páginas y tipografías
  * Correo, teléfono, LinkedIn y ubicación
  * Secciones estándar, consistencia de fechas y orden cronológico
  * Viñetas, verbos de acción, logros con cifras y primera persona
  * Datos sensibles (cédula, edad, estado civil…) y frases genéricas
* **«Así lo lee el ATS»:** muestra el texto exacto que se extrajo, en orden.
* Al recargar, el informe se conserva (se guarda el texto extraído, no el archivo).

## Rutas

| Ruta | Contenido |
|---|---|
| `/` | Presentación, normas ATS y acceso a «continuar» si hay una hoja de vida guardada |
| `/crear` | Editor con vista previa y exportación |
| `/analizar` | Analizador ATS de archivos |

## Desarrollo

```bash
npm install && npm run dev
```

Queda en http://127.0.0.1:3200. Los puertos se eligieron para no chocar con Órbita (3000), Zentrika.com (3100) ni ZentrikaOS (5173 / 8100).

Variables opcionales en `.env.local`. Copia `.env.example`; solo contiene las URL del ecosistema que se muestran en el pie de página.

## Docker

```bash
docker compose up -d --build
```

Corre en http://127.0.0.1:3200. No necesita base de datos ni otros servicios.

## Comprobaciones

```bash
npm run typecheck
```

```bash
npm run build
```

```bash
npm run check:design-system
```

El último verifica que la copia del design system esté al día con `../ZentrikaOS/design-system`. Para actualizarla, usa `npm run sync:design-system`.

## Datos y privacidad

| Clave de `localStorage` | Contenido |
|---|---|
| `perfila:cv:v1` | Hoja de vida (esquema validado por `sanitizeCv`) |
| `perfila:cv:v1:savedAt` | Fecha del último guardado |
| `perfila:editor:step` | Paso actual del editor |
| `perfila:editor:jd` | Oferta pegada en la revisión del editor |
| `perfila:ats:v1` | Oferta y último análisis (texto extraído y metadatos, no el archivo) |
| `perfila:theme` | Tema claro u oscuro |

* El guardado espera 350 ms y se fuerza al ocultar o cerrar la pestaña.
* Los cambios se sincronizan entre pestañas.
* Si el almacenamiento está lleno o bloqueado, la app sigue funcionando en memoria y avisa para exportar un respaldo.

Seguridad:
* La CSP no permite recursos de terceros y no hay `connect-src` externo.
* La plantilla no recomienda ni pide foto, cédula, fecha de nacimiento ni estado civil.

## Por qué las plantillas cumplen las normas ATS

* Una sola columna, y el orden del HTML es el mismo orden visual.
* Texto real, sin imágenes, íconos, tablas ni cuadros de texto. Los títulos son estándar en español o inglés.
* Las viñetas son el carácter `•`. Las viñetas automáticas de CSS se dibujan como formas en el PDF y el ATS no las ve.
* Las fuentes son de sistema: Arial y Georgia. Chrome imprime las fuentes variables (como Inter Variable) como Type 3, y algunos ATS no las leen. Arial y Georgia se incrustan como TrueType.
* No hay ligaduras, y el espaciado entre letras es de 0,1em como máximo y solo en títulos: desde 0,2em, pdftotext y el extractor de Perfila leen «E D U C A C I Ó N». El analizador también detecta este problema en archivos subidos.

## Estructura

```
src/app/                 rutas (inicio, crear, analizar), globals.css (interfaz), cv.css (plantillas + impresión)
src/components/editor/   editor: pasos, campos, vista previa, revisión y exportación
src/components/templates CvDocument (HTML semántico común) y metadatos de plantillas
src/components/ats/      analizador y piezas del informe
src/lib/cv/              modelo, valores por defecto/saneamiento, formato es/en, texto plano, DOCX
src/lib/ats/             reglas del análisis, léxico (verbos, secciones, palabras vacías), lectura de archivos
src/lib/files/           extractor PDF, lector DOCX y ZIP (lectura/escritura)
src/design-system/       copia sincronizada del design system de ZENTRIKA
```
