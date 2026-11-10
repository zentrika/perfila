import { extractDocx } from '@/lib/files/docx-reader';
import { extractPdf } from '@/lib/files/pdf';

import { analyze, type AnalyzeInput, type Report } from './analyze';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface FileAnalysis {
  fileName: string;
  fileSize: number;
  kind: 'pdf' | 'docx' | 'txt';
  text: string;
  meta: { pages: number | null; images: number; multiColumn: boolean; fonts: string[]; producer?: string; tables?: number; textBoxes?: number };
  input: Omit<AnalyzeInput, 'jobDescription'>;
  report: Report;
  analyzedAt: number;
}

function detectKind(name: string, bytes: Uint8Array): FileAnalysis['kind'] | null {
  const head = String.fromCharCode(...bytes.subarray(0, 5));
  if (head.startsWith('%PDF') || /\.pdf$/i.test(name)) return 'pdf';
  if ((bytes[0] === 0x50 && bytes[1] === 0x4b) || /\.docx$/i.test(name)) return 'docx';
  if (/\.(txt|md)$/i.test(name)) return 'txt';
  return null;
}

/** Lee y analiza un archivo por completo dentro del navegador. Nada se envía a ningún servidor. */
export async function analyzeFile(file: File, jobDescription: string): Promise<FileAnalysis> {
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo pesa más de 10 MB. Exporta una versión sin imágenes.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectKind(file.name, bytes);
  if (!kind) {
    if (/\.doc$/i.test(file.name)) throw new Error('El formato .doc (Word 97-2003) es antiguo y muchos ATS lo leen mal. Guárdalo como .docx o PDF y vuelve a intentarlo.');
    throw new Error('Formato no compatible. Sube un PDF, un DOCX o un TXT.');
  }

  let input: Omit<AnalyzeInput, 'jobDescription'>;
  let meta: FileAnalysis['meta'];

  if (kind === 'pdf') {
    const r = await extractPdf(bytes);
    meta = { pages: r.pages.length, images: r.images, multiColumn: r.pages.some((p) => p.multiColumn), fonts: r.fonts, producer: r.producer || r.creator };
    input = {
      text: r.text,
      source: 'pdf',
      fileName: file.name,
      fileSize: file.size,
      pages: r.pages.length,
      images: r.images,
      multiColumn: meta.multiColumn,
      fonts: r.fonts,
      undecodable: r.undecodable,
      encrypted: r.encrypted,
    };
  } else if (kind === 'docx') {
    const r = await extractDocx(bytes);
    meta = { pages: r.pages, images: r.images, multiColumn: r.columns > 1, fonts: r.fonts, tables: r.tables, textBoxes: r.textBoxes };
    input = {
      text: r.text,
      source: 'docx',
      fileName: file.name,
      fileSize: file.size,
      pages: r.pages,
      images: r.images,
      multiColumn: r.columns > 1,
      tables: r.tables,
      textBoxes: r.textBoxes,
      fonts: r.fonts,
      headerFooterText: r.headerFooterText,
    };
  } else {
    const text = new TextDecoder().decode(bytes);
    meta = { pages: null, images: 0, multiColumn: false, fonts: [] };
    input = { text, source: 'txt', fileName: file.name, fileSize: file.size };
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    kind,
    text: input.text,
    meta,
    input,
    report: analyze({ ...input, jobDescription }),
    analyzedAt: Date.now(),
  };
}
