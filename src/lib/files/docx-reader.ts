import { listZip, readZipEntry } from './zip';

export interface DocxExtract {
  text: string;
  /** Texto de encabezados y pies de página (muchos ATS lo ignoran). */
  headerFooterText: string;
  tables: number;
  textBoxes: number;
  images: number;
  columns: number;
  pages: number | null;
  fonts: string[];
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');

/** Texto de un XML de WordprocessingML, párrafo por párrafo, como lo leería un ATS. */
function paragraphsText(xml: string): string {
  // Las alternativas VML repiten el contenido de los cuadros de texto: se quitan para no duplicar.
  const clean = xml.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');
  const out: string[] = [];
  for (const p of clean.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
    let line = '';
    for (const tok of p[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:numPr>/g)) {
      if (tok[0] === '<w:tab/>') line += '\t';
      else if (tok[0] === '<w:br/>') line += '\n';
      else if (tok[0] === '<w:numPr>') line += '• ';
      else line += decodeXml(tok[1] ?? '');
    }
    out.push(line);
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractDocx(bytes: Uint8Array): Promise<DocxExtract> {
  const entries = listZip(bytes);
  const get = async (name: string) => {
    const e = entries.find((x) => x.name === name);
    return e ? new TextDecoder().decode(await readZipEntry(bytes, e)) : '';
  };
  const doc = await get('word/document.xml');
  if (!doc) throw new Error('El archivo no parece un documento de Word (.docx).');

  let headerFooter = '';
  for (const e of entries.filter((x) => /^word\/(header|footer)\d*\.xml$/.test(x.name))) {
    headerFooter += '\n' + paragraphsText(new TextDecoder().decode(await readZipEntry(bytes, e)));
  }

  const app = await get('docProps/app.xml');
  const pages = /<Pages>(\d+)<\/Pages>/.exec(app);
  const cols = [...doc.matchAll(/<w:cols\b[^>]*w:num="(\d+)"/g)].map((m) => Number(m[1]));
  const fonts = new Set<string>();
  for (const m of doc.matchAll(/w:rFonts\b[^>]*w:ascii="([^"]+)"/g)) fonts.add(m[1]);
  const styles = await get('word/styles.xml');
  for (const m of styles.matchAll(/w:rFonts\b[^>]*w:ascii="([^"]+)"/g)) fonts.add(m[1]);

  return {
    text: paragraphsText(doc),
    headerFooterText: headerFooter.trim(),
    tables: (doc.match(/<w:tbl>/g) ?? []).length,
    textBoxes: (doc.match(/<w:txbxContent>/g) ?? []).length,
    images: entries.filter((x) => /^word\/media\/.+\.(png|jpe?g|gif|bmp|tiff?|emf|wmf|svg)$/i.test(x.name)).length,
    columns: cols.length ? Math.max(...cols) : 1,
    pages: pages ? Number(pages[1]) : null,
    fonts: [...fonts],
  };
}
