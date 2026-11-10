import { FONTS } from '@/components/templates/templates';
import { createZip } from '@/lib/files/zip';

import { toBlocks } from './plaintext';
import type { CvData } from './types';

/**
 * Genera un .docx sin dependencias: una sola columna, estilos de título reales (Heading 1/2),
 * viñetas con numeración nativa de Word, sin tablas, cuadros de texto ni imágenes.
 * Es el formato que algunos ATS (y reclutadores) prefieren para editar o reprocesar.
 */

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const run = (text: string, opts: { bold?: boolean; color?: string; size?: number } = {}) => {
  if (!text) return '';
  const props = [
    opts.bold ? '<w:b/>' : '',
    opts.color ? `<w:color w:val="${opts.color}"/>` : '',
    opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : '',
  ].join('');
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
};

const para = (content: string, pPr = '') => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${content}</w:p>`;

export function toDocx(cv: CvData): Uint8Array {
  const accent = cv.settings.template === 'minimal' || cv.settings.template === 'clasica' || cv.settings.template === 'elegante' ? '111827' : cv.settings.accent.replace('#', '');
  const letter = cv.settings.paper === 'letter';
  const pageW = letter ? 12240 : 11906;
  const pageH = letter ? 15840 : 16838;
  const body: string[] = [];
  const font = FONTS.find((f) => f.value === cv.settings.font)?.word ?? 'Calibri';

  for (const b of toBlocks(cv)) {
    switch (b.kind) {
      case 'name':
        body.push(para(run(b.text || 'Hoja de vida'), '<w:pStyle w:val="Title"/>'));
        break;
      case 'headline':
        body.push(para(run(b.text, { color: accent }), '<w:spacing w:after="40"/>'));
        break;
      case 'contact':
        body.push(para(run(b.text, { color: '374151' }), '<w:spacing w:after="160"/>'));
        break;
      case 'heading':
        body.push(para(run(b.text), '<w:pStyle w:val="Heading1"/>'));
        break;
      case 'entry':
        // Fecha alineada a la derecha con una tabulación (no con tablas): el ATS lee «Cargo — Empresa	Fecha».
        body.push(
          para(
            run(b.title, { bold: true }) + (b.date ? `<w:r><w:tab/></w:r>${run(b.date)}` : ''),
            `<w:pStyle w:val="Heading2"/><w:tabs><w:tab w:val="right" w:pos="${pageW - 2 * 1000}"/></w:tabs>`,
          ),
        );
        if (b.sub) body.push(para(run(b.sub, { color: '4B5563' }), '<w:spacing w:after="40"/>'));
        break;
      case 'bullet':
        body.push(
          para(
            (b.boldPrefix ? run(b.boldPrefix, { bold: true }) : '') + run(b.text),
            '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>',
          ),
        );
        break;
      case 'para':
        body.push(para((b.boldPrefix ? run(b.boldPrefix, { bold: true }) : '') + run(b.text)));
        break;
    }
  }

  const sectPr = `<w:sectPr><w:pgSz w:w="${pageW}" w:h="${pageH}"/><w:pgMar w:top="900" w:right="1000" w:bottom="900" w:left="1000" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr>`;

  const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const R_NS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W_NS} ${R_NS}><w:body>${body.join('')}${sectPr}</w:body></w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W_NS}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="${cv.settings.lang === 'es' ? 'es-CO' : 'en-US'}"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/><w:color w:val="111827"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="${accent}"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="${accent}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="20"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="111827"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="30"/><w:ind w:left="360" w:hanging="240"/></w:pPr></w:style>
</w:styles>`;

  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${W_NS}>
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

  const name = cv.personal.fullName.trim() || 'Hoja de vida';
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(`${name} — ${cv.settings.lang === 'es' ? 'Hoja de vida' : 'Resume'}`)}</dc:title>
<dc:creator>${esc(name)}</dc:creator>
<cp:keywords>${esc(cv.personal.headline)}</cp:keywords>
</cp:coreProperties>`;

  return createZip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'word/document.xml', data: document },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/numbering.xml', data: numbering },
    { name: 'docProps/core.xml', data: core },
  ]);
}
