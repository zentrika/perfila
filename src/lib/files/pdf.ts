import { inflate } from './zip';

/**
 * Extractor de texto PDF sin dependencias, pensado para imitar a un ATS básico:
 * lee los objetos del archivo (incluidos los flujos de objetos comprimidos), decodifica las
 * fuentes con sus mapas ToUnicode o codificaciones estándar, interpreta los operadores de texto
 * con su posición en la página y reconstruye las líneas por coordenadas.
 *
 * Si este extractor no puede leer un texto (fuentes sin mapa Unicode, texto convertido en curvas,
 * hojas escaneadas), lo más probable es que un ATS tampoco pueda.
 */

// ── Tipos del modelo de objetos PDF ────────────────────────────────────────

interface PName {
  t: 'name';
  v: string;
}
interface PStr {
  t: 'str';
  v: string; // bytes en latin1
}
interface PRef {
  t: 'ref';
  n: number;
}
interface PDict {
  t: 'dict';
  m: Record<string, PObj>;
}
interface PStream {
  t: 'stream';
  dict: PDict;
  data: Uint8Array;
}
type PObj = number | boolean | null | PName | PStr | PRef | PDict | PStream | PObj[];

export interface PdfRun {
  x: number;
  y: number;
  xEnd: number;
  size: number;
  text: string;
}

export interface PdfPage {
  width: number;
  height: number;
  lines: string[];
  /** Posición x de inicio de cada línea y de cada segmento separado por un gran espacio. */
  multiColumn: boolean;
}

export interface PdfExtract {
  pages: PdfPage[];
  text: string;
  images: number;
  fonts: string[];
  encrypted: boolean;
  producer: string;
  creator: string;
  title: string;
  /** Glifos que no se pudieron convertir a texto (fuentes sin ToUnicode). */
  undecodable: number;
  glyphs: number;
}

// ── Utilidades ─────────────────────────────────────────────────────────────

function bytesToLatin1(b: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < b.length; i += CH) s += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + CH)));
  return s;
}

const isWs = (c: number) => c === 32 || c === 10 || c === 13 || c === 9 || c === 12 || c === 0;
const isDelim = (c: number) =>
  c === 40 || c === 41 || c === 60 || c === 62 || c === 91 || c === 93 || c === 123 || c === 125 || c === 47 || c === 37;

/** Decodifica una cadena PDF de texto (UTF-16BE con BOM o PDFDocEncoding≈latin1). */
export function pdfTextString(s: string): string {
  if (s.charCodeAt(0) === 0xfe && s.charCodeAt(1) === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < s.length; i += 2) out += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1));
    return out;
  }
  if (s.charCodeAt(0) === 0xef && s.charCodeAt(1) === 0xbb && s.charCodeAt(2) === 0xbf) {
    try {
      return new TextDecoder().decode(Uint8Array.from(s.slice(3), (c) => c.charCodeAt(0)));
    } catch {
      return s.slice(3);
    }
  }
  return s;
}

type M = [number, number, number, number, number, number];
const ID: M = [1, 0, 0, 1, 0, 0];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
];

// ── Analizador de objetos ──────────────────────────────────────────────────

class Lexer {
  pos: number;
  constructor(
    public s: string,
    pos = 0,
  ) {
    this.pos = pos;
  }

  skipWs() {
    const s = this.s;
    for (;;) {
      while (this.pos < s.length && isWs(s.charCodeAt(this.pos))) this.pos++;
      if (s.charCodeAt(this.pos) === 37) {
        while (this.pos < s.length && s[this.pos] !== '\n' && s[this.pos] !== '\r') this.pos++;
        continue;
      }
      break;
    }
  }

  /** Lee el siguiente objeto. Devuelve `undefined` en un operador (lo deja en `op`). */
  op = '';
  next(): PObj | undefined | typeof END {
    this.skipWs();
    const s = this.s;
    if (this.pos >= s.length) return END;
    const c = s[this.pos];
    if (c === '/') {
      this.pos++;
      let name = '';
      while (this.pos < s.length) {
        const cc = s.charCodeAt(this.pos);
        if (isWs(cc) || isDelim(cc)) break;
        if (cc === 35 && /^[0-9a-fA-F]{2}$/.test(s.substr(this.pos + 1, 2))) {
          name += String.fromCharCode(parseInt(s.substr(this.pos + 1, 2), 16));
          this.pos += 3;
        } else {
          name += s[this.pos++];
        }
      }
      return { t: 'name', v: name };
    }
    if (c === '(') return this.literal();
    if (c === '<') {
      if (s[this.pos + 1] === '<') {
        this.pos += 2;
        return this.dict();
      }
      const end = s.indexOf('>', this.pos);
      const hex = s.slice(this.pos + 1, end < 0 ? s.length : end).replace(/[^0-9a-fA-F]/g, '');
      this.pos = end < 0 ? s.length : end + 1;
      let out = '';
      for (let i = 0; i < hex.length; i += 2) out += String.fromCharCode(parseInt((hex.substr(i, 2) + '0').slice(0, 2), 16));
      return { t: 'str', v: out };
    }
    if (c === '[') {
      this.pos++;
      const arr: PObj[] = [];
      for (;;) {
        const v = this.next();
        if (v === END) break;
        if (v === undefined) {
          if (this.op === ']') break;
          if (this.op === 'R' && arr.length >= 2) {
            arr.pop();
            const n = arr.pop() as number;
            arr.push({ t: 'ref', n });
          }
          continue;
        }
        arr.push(v);
      }
      return arr;
    }
    if (c === ']' || c === '>' || c === '{' || c === '}' || c === ')') {
      this.pos++;
      if (c === '>' && s[this.pos] === '>') this.pos++;
      this.op = c === '>' ? '>>' : c;
      return undefined;
    }
    // número o palabra clave
    const start = this.pos;
    while (this.pos < s.length) {
      const cc = s.charCodeAt(this.pos);
      if (isWs(cc) || isDelim(cc) || cc === 93 || cc === 62) break;
      this.pos++;
    }
    if (this.pos === start) {
      this.pos++;
      this.op = c;
      return undefined;
    }
    const word = s.slice(start, this.pos);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return parseFloat(word);
    if (word === 'true') return true;
    if (word === 'false') return false;
    if (word === 'null') return null;
    this.op = word;
    return undefined;
  }

  literal(): PStr {
    const s = this.s;
    this.pos++;
    let depth = 1;
    let out = '';
    while (this.pos < s.length) {
      const ch = s[this.pos++];
      if (ch === '\\') {
        const n = s[this.pos++];
        if (n === 'n') out += '\n';
        else if (n === 'r') out += '\r';
        else if (n === 't') out += '\t';
        else if (n === 'b') out += '\b';
        else if (n === 'f') out += '\f';
        else if (n === '\r') {
          if (s[this.pos] === '\n') this.pos++;
        } else if (n === '\n') {
          /* continuación de línea */
        } else if (n >= '0' && n <= '7') {
          let oct = n;
          while (oct.length < 3 && s[this.pos] >= '0' && s[this.pos] <= '7') oct += s[this.pos++];
          out += String.fromCharCode(parseInt(oct, 8) & 0xff);
        } else out += n ?? '';
      } else if (ch === '(') {
        depth++;
        out += ch;
      } else if (ch === ')') {
        if (--depth === 0) break;
        out += ch;
      } else out += ch;
    }
    return { t: 'str', v: out };
  }

  dict(): PDict {
    const m: Record<string, PObj> = {};
    const items: PObj[] = [];
    for (;;) {
      const v = this.next();
      if (v === END) break;
      if (v === undefined) {
        if (this.op === '>>') break;
        if (this.op === 'R' && items.length >= 2) {
          items.pop();
          const n = items.pop() as number;
          items.push({ t: 'ref', n });
        }
        continue;
      }
      items.push(v);
    }
    for (let i = 0; i + 1 < items.length; i += 2) {
      const k = items[i];
      if (k && typeof k === 'object' && !Array.isArray(k) && k.t === 'name') m[k.v] = items[i + 1];
    }
    return { t: 'dict', m };
  }
}
const END = Symbol('end');

const isDict = (o: PObj | undefined): o is PDict => !!o && typeof o === 'object' && !Array.isArray(o) && o.t === 'dict';
const isStream = (o: PObj | undefined): o is PStream => !!o && typeof o === 'object' && !Array.isArray(o) && o.t === 'stream';
const isName = (o: PObj | undefined): o is PName => !!o && typeof o === 'object' && !Array.isArray(o) && o.t === 'name';
const isStr = (o: PObj | undefined): o is PStr => !!o && typeof o === 'object' && !Array.isArray(o) && o.t === 'str';
const isRef = (o: PObj | undefined): o is PRef => !!o && typeof o === 'object' && !Array.isArray(o) && o.t === 'ref';

// ── Documento ──────────────────────────────────────────────────────────────

class PdfDoc {
  objects = new Map<number, PObj>();
  bin: string;
  constructor(public bytes: Uint8Array) {
    this.bin = bytesToLatin1(bytes);
  }

  async load() {
    const re = /(\d+)\s+(\d+)\s+obj\b/g;
    const s = this.bin;
    let m: RegExpExecArray | null;
    const objStreams: PStream[] = [];
    while ((m = re.exec(s))) {
      const num = parseInt(m[1], 10);
      const lx = new Lexer(s, m.index + m[0].length);
      let val = lx.next();
      if (val === END || val === undefined) continue;
      lx.skipWs();
      if (isDict(val) && s.startsWith('stream', lx.pos)) {
        let start = lx.pos + 6;
        if (s[start] === '\r') start++;
        if (s[start] === '\n') start++;
        const len = val.m.Length;
        let end = -1;
        if (typeof len === 'number' && start + len <= s.length && /^\s*endstream/.test(s.substr(start + len, 24))) end = start + len;
        if (end < 0) {
          end = s.indexOf('endstream', start);
          if (end < 0) end = s.length;
          while (end > start && (s[end - 1] === '\n' || s[end - 1] === '\r')) end--;
        }
        val = { t: 'stream', dict: val, data: this.bytes.subarray(start, end) };
        re.lastIndex = end;
        const type = val.dict.m.Type;
        if (isName(type) && type.v === 'ObjStm') objStreams.push(val);
      }
      this.objects.set(num, val);
    }

    // Objetos dentro de flujos de objetos (PDF 1.5+, habitual en Word, Chrome o Canva).
    for (const st of objStreams) {
      try {
        const data = bytesToLatin1(await this.decode(st));
        const n = Number(st.dict.m.N) || 0;
        const first = Number(st.dict.m.First) || 0;
        const header = new Lexer(data, 0);
        const pairs: [number, number][] = [];
        for (let i = 0; i < n; i++) {
          const a = header.next();
          const b = header.next();
          if (typeof a !== 'number' || typeof b !== 'number') break;
          pairs.push([a, b]);
        }
        for (const [num, off] of pairs) {
          if (this.objects.has(num)) continue;
          const v = new Lexer(data, first + off).next();
          if (v !== END && v !== undefined) this.objects.set(num, v);
        }
      } catch {
        /* flujo dañado: se omite */
      }
    }
  }

  get(o: PObj | undefined, depth = 0): PObj | undefined {
    if (isRef(o) && depth < 32) return this.get(this.objects.get(o.n), depth + 1);
    return o;
  }

  dictOf(o: PObj | undefined): PDict | undefined {
    const v = this.get(o);
    if (isDict(v)) return v;
    if (isStream(v)) return v.dict;
    return undefined;
  }

  async decode(st: PStream): Promise<Uint8Array> {
    let data = st.data;
    const f = this.get(st.dict.m.Filter);
    const filters = Array.isArray(f) ? f.map((x) => this.get(x)) : f ? [f] : [];
    for (const flt of filters) {
      const name = isName(flt) ? flt.v : '';
      if (name === 'FlateDecode' || name === 'Fl') {
        let out = await inflate(data, 'deflate');
        if (!out.length && data.length > 2) out = await inflate(data, 'deflate-raw');
        if (!out.length && data.length > 2) out = await inflate(data.subarray(2), 'deflate-raw');
        data = out;
      } else if (name === 'ASCIIHexDecode' || name === 'AHx') {
        const hex = bytesToLatin1(data).replace(/>.*$/s, '').replace(/[^0-9a-fA-F]/g, '');
        const out = new Uint8Array(Math.ceil(hex.length / 2));
        for (let i = 0; i < out.length; i++) out[i] = parseInt((hex.substr(i * 2, 2) + '0').slice(0, 2), 16);
        data = out;
      } else if (name === 'ASCII85Decode' || name === 'A85') {
        data = ascii85(bytesToLatin1(data));
      } else {
        // LZW, imágenes (DCT, JPX, CCITT…): no contienen texto legible para nosotros.
        return new Uint8Array(0);
      }
    }
    return data;
  }
}

function ascii85(s: string): Uint8Array {
  s = s.replace(/^<~/, '').replace(/~>.*$/s, '').replace(/\s+/g, '');
  const out: number[] = [];
  let tuple: number[] = [];
  for (const ch of s) {
    if (ch === 'z' && tuple.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    tuple.push(ch.charCodeAt(0) - 33);
    if (tuple.length === 5) {
      let v = 0;
      for (const d of tuple) v = v * 85 + d;
      out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
      tuple = [];
    }
  }
  if (tuple.length) {
    const n = tuple.length;
    while (tuple.length < 5) tuple.push(84);
    let v = 0;
    for (const d of tuple) v = v * 85 + d;
    const bytes = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    out.push(...bytes.slice(0, n - 1));
  }
  return Uint8Array.from(out);
}

// ── Fuentes ────────────────────────────────────────────────────────────────

interface Font {
  name: string;
  twoByte: boolean;
  map: Map<number, string>;
  decodable: boolean;
  width: (code: number) => number;
}

const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
  // Códigos sin definir en WinAnsi: la especificación indica dibujarlos como viñeta.
  0x7f: '•', 0x81: '•', 0x8d: '•', 0x8f: '•', 0x90: '•', 0x9d: '•',
};

function winAnsi(code: number): string {
  if (code >= 0x20 && code < 0x7f) return String.fromCharCode(code);
  if (code >= 0xa0) return String.fromCharCode(code);
  return WIN_ANSI_HIGH[code] ?? '';
}

/** Nombres de glifo frecuentes → Unicode (para fuentes con /Differences y sin ToUnicode). */
const GLYPHS: Record<string, string> = {
  space: ' ', exclam: '!', quotedbl: '"', numbersign: '#', dollar: '$', percent: '%', ampersand: '&', quotesingle: "'",
  quoteright: '’', quoteleft: '‘', parenleft: '(', parenright: ')', asterisk: '*', plus: '+', comma: ',', hyphen: '-',
  minus: '−', period: '.', slash: '/', zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
  seven: '7', eight: '8', nine: '9', colon: ':', semicolon: ';', less: '<', equal: '=', greater: '>', question: '?',
  at: '@', bracketleft: '[', backslash: '\\', bracketright: ']', underscore: '_', braceleft: '{', bar: '|',
  braceright: '}', bullet: '•', endash: '–', emdash: '—', quotedblleft: '“', quotedblright: '”', ellipsis: '…',
  fi: 'fi', fl: 'fl', ff: 'ff', ffi: 'ffi', ffl: 'ffl', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', ntilde: 'ñ', Ntilde: 'Ñ', udieresis: 'ü',
  Udieresis: 'Ü', agrave: 'à', egrave: 'è', ccedilla: 'ç', exclamdown: '¡', questiondown: '¿', degree: '°',
  ordfeminine: 'ª', ordmasculine: 'º', copyright: '©', registered: '®', trademark: '™', middot: '·',
  periodcentered: '·', nbspace: ' ', euro: '€',
};

function glyphToUnicode(name: string): string {
  if (GLYPHS[name] !== undefined) return GLYPHS[name];
  if (/^[A-Za-z]$/.test(name)) return name;
  const uni = /^uni([0-9A-Fa-f]{4,})$/.exec(name) ?? /^u([0-9A-Fa-f]{4,6})$/.exec(name);
  if (uni) return String.fromCodePoint(parseInt(uni[1].slice(0, 6), 16));
  return '';
}

function utf16be(hex: string): string {
  let out = '';
  for (let i = 0; i + 3 < hex.length + 0; i += 4) out += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
  if (hex.length === 2) out = String.fromCharCode(parseInt(hex, 16));
  return out;
}

function parseCMap(text: string): { map: Map<number, string>; bytes: number } {
  const map = new Map<number, string>();
  let bytes = 0;
  const cs = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(text);
  if (cs) {
    const h = /<([0-9a-fA-F]+)>/.exec(cs[1]);
    if (h) bytes = h[1].length / 2;
  }
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      if (!bytes) bytes = m[1].length / 2;
      map.set(parseInt(m[1], 16), utf16be(m[2]));
    }
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]*>|\[[^\]]*\])/g)) {
      if (!bytes) bytes = m[1].length / 2;
      const lo = parseInt(m[1], 16);
      const hi = Math.min(parseInt(m[2], 16), lo + 65535);
      if (m[3].startsWith('[')) {
        const items = [...m[3].matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => x[1]);
        for (let c = lo; c <= hi && c - lo < items.length; c++) map.set(c, utf16be(items[c - lo]));
      } else {
        const dst = m[3].slice(1, -1);
        const base = utf16be(dst);
        if (!base) continue;
        const prefix = base.slice(0, -1);
        const last = base.charCodeAt(base.length - 1);
        for (let c = lo; c <= hi; c++) map.set(c, prefix + String.fromCharCode(last + (c - lo)));
      }
    }
  }
  return { map, bytes };
}


// Anchos AFM (caracteres 32–126) de las fuentes estándar que suelen usarse sin /Widths (jsPDF, ReportLab…).
const AFM: Record<string, number[]> = {
  helvetica: '278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584'.split(' ').map(Number),
  'helvetica-bold': '278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584'.split(' ').map(Number),
  times: '250 333 408 500 500 833 778 180 333 333 500 564 250 333 250 278 500 500 500 500 500 500 500 500 500 500 278 278 564 564 564 444 921 722 667 667 722 611 556 722 722 333 389 722 611 889 722 722 556 722 667 556 611 722 722 944 722 722 611 333 278 333 469 500 333 444 500 444 500 444 333 500 500 278 278 500 278 778 500 500 500 500 333 389 278 500 500 722 500 500 444 480 200 480 541'.split(' ').map(Number),
  'times-bold': '250 333 555 500 500 1000 833 278 333 333 500 570 250 333 250 278 500 500 500 500 500 500 500 500 500 500 333 333 570 570 570 500 930 722 667 722 722 667 611 778 778 389 500 778 667 944 722 778 611 778 722 556 667 722 722 1000 722 722 667 333 278 333 581 500 333 500 556 444 556 444 333 500 556 278 333 556 278 833 556 500 556 556 444 389 333 556 500 722 500 500 444 394 220 394 520'.split(' ').map(Number),
};

function standardWidths(baseFont: string): ((ch: string) => number) | null {
  const n = baseFont.toLowerCase();
  if (n.startsWith('courier')) return () => 600;
  const bold = /bold|black|heavy/.test(n);
  const key = n.startsWith('helvetica') || n.startsWith('arial') ? (bold ? 'helvetica-bold' : 'helvetica') : n.startsWith('times') ? (bold ? 'times-bold' : 'times') : '';
  if (!key) return null;
  const table = AFM[key];
  const avg = key.startsWith('times') ? 480 : 540;
  return (ch: string) => {
    if (!ch) return avg;
    if (ch === '•') return 350;
    if (ch === '–') return key.startsWith('times') ? 500 : 556;
    if (ch === '—') return 1000;
    const base = ch.normalize('NFD').charCodeAt(0);
    return base >= 32 && base <= 126 ? table[base - 32] : avg;
  };
}

async function buildFont(doc: PdfDoc, ref: PObj | undefined): Promise<Font> {
  const d = doc.dictOf(ref);
  const fallback: Font = { name: '', twoByte: false, map: new Map(), decodable: true, width: () => 500 };
  if (!d) return fallback;
  const subtype = (doc.get(d.m.Subtype) as PName | undefined)?.v ?? '';
  const base = doc.get(d.m.BaseFont);
  const name = isName(base) ? base.v.replace(/^[A-Z]{6}\+/, '') : subtype;
  const twoByte = subtype === 'Type0';

  let map = new Map<number, string>();
  let hasToUnicode = false;
  const tu = doc.get(d.m.ToUnicode);
  if (isStream(tu)) {
    try {
      const cm = parseCMap(bytesToLatin1(await doc.decode(tu)));
      if (cm.map.size) {
        map = cm.map;
        hasToUnicode = true;
      }
    } catch {
      /* mapa ilegible */
    }
  }

  let width: (c: number) => number = () => 500;
  let decodable = true;

  if (twoByte) {
    const desc = doc.get(d.m.DescendantFonts);
    const df = doc.dictOf(Array.isArray(desc) ? desc[0] : desc);
    const dw = Number(doc.get(df?.m.DW)) || 1000;
    const widths = new Map<number, number>();
    const w = doc.get(df?.m.W);
    if (Array.isArray(w)) {
      for (let i = 0; i < w.length; ) {
        const a = doc.get(w[i]) as number;
        const b = doc.get(w[i + 1]);
        if (Array.isArray(b)) {
          b.forEach((x, k) => widths.set(a + k, Number(doc.get(x)) || dw));
          i += 2;
        } else {
          const c = Number(doc.get(w[i + 2])) || dw;
          for (let k = a; k <= (b as number) && k - a < 65536; k++) widths.set(k, c);
          i += 3;
        }
      }
    }
    width = (c) => widths.get(c) ?? dw;
    // Sin ToUnicode, los códigos CID (Identity-H) no se pueden convertir en letras.
    decodable = hasToUnicode;
  } else {
    const first = Number(doc.get(d.m.FirstChar)) || 0;
    const ws = doc.get(d.m.Widths);
    const fd = doc.dictOf(d.m.FontDescriptor);
    const missing = Number(doc.get(fd?.m.MissingWidth)) || 500;
    // Type3: los anchos están en el espacio del glifo y se escalan con /FontMatrix.
    const fmx = doc.get(d.m.FontMatrix);
    const k = subtype === 'Type3' && Array.isArray(fmx) ? (Number(doc.get(fmx[0])) || 0.001) * 1000 : 1;
    if (Array.isArray(ws)) width = (c) => (Number(doc.get(ws[c - first])) || missing) * k;
    else {
      const std = standardWidths(isName(base) ? base.v.replace(/^[A-Z]{6}\+/, '') : '');
      width = std ? (c) => std(map.get(c) ?? winAnsi(c)) : () => missing;
    }

    if (!hasToUnicode) {
      // Codificación base (WinAnsi como aproximación general) + diferencias por nombre de glifo.
      for (let c = 0; c < 256; c++) {
        const ch = winAnsi(c);
        if (ch) map.set(c, ch);
      }
      const enc = doc.get(d.m.Encoding);
      const encDict = isDict(enc) ? enc : undefined;
      const diffs = encDict ? doc.get(encDict.m.Differences) : undefined;
      if (Array.isArray(diffs)) {
        let code = 0;
        for (const it of diffs) {
          const v = doc.get(it);
          if (typeof v === 'number') code = v;
          else if (isName(v)) {
            const u = glyphToUnicode(v.v);
            if (u) map.set(code, u);
            else map.delete(code);
            code++;
          }
        }
      }
      // Fuentes Type3 o simbólicas sin mapa: probablemente íconos.
      if (subtype === 'Type3' && !Array.isArray(diffs)) decodable = false;
    }
  }

  return { name, twoByte, map, decodable, width };
}

// ── Intérprete de contenido ────────────────────────────────────────────────

interface Ctx {
  doc: PdfDoc;
  runs: PdfRun[];
  imageRefs: Set<number | string>;
  fontCache: Map<string, Font>;
  fontNames: Set<string>;
  stats: { glyphs: number; undecodable: number };
}

/** Familia tipográfica sin subconjunto ni variante: «ABCDEF+Calibri-Bold» → «Calibri». */
function familyOf(name: string): string {
  return name
    .replace(/^[A-Z]{6}\+/, '')
    .replace(/(PSMT|MT)$/, '')
    .replace(/[-,]?(Bold|Italic|Regular|Light|Medium|Semi[Bb]old|Black|Oblique|Book|Heavy|Thin|Condensed)+$/i, '')
    .replace(/PS$/, '')
    .replace(/[-,]+$/, '');
}

async function fontsOf(ctx: Ctx, resources: PDict | undefined): Promise<Record<string, Font>> {
  const out: Record<string, Font> = {};
  const fd = ctx.doc.dictOf(resources?.m.Font);
  if (!fd) return out;
  for (const [k, v] of Object.entries(fd.m)) {
    const key = isRef(v) ? `r${v.n}` : `${k}:${Math.random()}`;
    let f = ctx.fontCache.get(key);
    if (!f) {
      f = await buildFont(ctx.doc, v);
      ctx.fontCache.set(key, f);
    }
    out[k] = f;
  }
  return out;
}

async function runContent(ctx: Ctx, data: Uint8Array, resources: PDict | undefined, ctm0: M, depth: number) {
  if (depth > 6) return;
  const fonts = await fontsOf(ctx, resources);
  const xobjs = ctx.doc.dictOf(resources?.m.XObject);
  const s = bytesToLatin1(data);
  const lx = new Lexer(s);
  const ops: PObj[] = [];

  let ctm: M = ctm0;
  const gstack: { ctm: M; ts: typeof ts }[] = [];
  let ts = { font: undefined as Font | undefined, size: 0, tc: 0, tw: 0, th: 1, tl: 0, rise: 0 };
  let tm: M = ID;
  let tlm: M = ID;

  const emit = (str: string) => {
    const f = ts.font;
    if (!f) return;
    const size = ts.size || 1;
    const m = mul(tm, ctm);
    const start = mul([size * ts.th, 0, 0, size, 0, ts.rise], m);
    const effSize = Math.abs(size * Math.hypot(m[2], m[3])) || size;
    let text = '';
    let tx = 0;
    const step = f.twoByte ? 2 : 1;
    for (let i = 0; i + step - 1 < str.length; i += step) {
      const code = step === 2 ? (str.charCodeAt(i) << 8) | str.charCodeAt(i + 1) : str.charCodeAt(i);
      ctx.stats.glyphs++;
      const u = f.map.get(code);
      if (!f.decodable || u === undefined) {
        if (!(step === 1 && code === 32)) ctx.stats.undecodable++;
        else text += ' ';
      } else text += u;
      const w = f.width(code) / 1000;
      tx += (w * size + ts.tc + (step === 1 && code === 32 ? ts.tw : 0)) * ts.th;
    }
    tm = mul([1, 0, 0, 1, tx, 0], tm);
    const endM = mul(tm, ctm);
    if (text.length) {
      ctx.runs.push({ x: start[4], y: start[5], xEnd: endM[4], size: effSize, text });
      if (f.name && text.trim()) ctx.fontNames.add(familyOf(f.name));
    }
  };

  for (;;) {
    const v = lx.next();
    if (v === END) break;
    if (v !== undefined) {
      ops.push(v);
      continue;
    }
    const op = lx.op;
    const num = (i: number) => Number(ops[i]) || 0;
    switch (op) {
      case 'q':
        gstack.push({ ctm, ts: { ...ts } });
        break;
      case 'Q': {
        const g = gstack.pop();
        if (g) {
          ctm = g.ctm;
          ts = g.ts;
        }
        break;
      }
      case 'cm':
        if (ops.length >= 6) ctm = mul([num(0), num(1), num(2), num(3), num(4), num(5)], ctm);
        break;
      case 'BT':
        tm = ID;
        tlm = ID;
        break;
      case 'Tf': {
        const n = ops[0];
        ts.font = isName(n) ? fonts[n.v] : undefined;
        ts.size = num(1);
        break;
      }
      case 'Tc':
        ts.tc = num(0);
        break;
      case 'Tw':
        ts.tw = num(0);
        break;
      case 'Tz':
        ts.th = num(0) / 100;
        break;
      case 'TL':
        ts.tl = num(0);
        break;
      case 'Ts':
        ts.rise = num(0);
        break;
      case 'Td':
        tlm = mul([1, 0, 0, 1, num(0), num(1)], tlm);
        tm = tlm;
        break;
      case 'TD':
        ts.tl = -num(1);
        tlm = mul([1, 0, 0, 1, num(0), num(1)], tlm);
        tm = tlm;
        break;
      case 'Tm':
        tlm = [num(0), num(1), num(2), num(3), num(4), num(5)];
        tm = tlm;
        break;
      case 'T*':
        tlm = mul([1, 0, 0, 1, 0, -ts.tl], tlm);
        tm = tlm;
        break;
      case 'Tj':
        if (isStr(ops[0])) emit(ops[0].v);
        break;
      case "'":
        tlm = mul([1, 0, 0, 1, 0, -ts.tl], tlm);
        tm = tlm;
        if (isStr(ops[0])) emit(ops[0].v);
        break;
      case '"':
        ts.tw = num(0);
        ts.tc = num(1);
        tlm = mul([1, 0, 0, 1, 0, -ts.tl], tlm);
        tm = tlm;
        if (isStr(ops[2])) emit(ops[2].v);
        break;
      case 'TJ': {
        const arr = ops[0];
        if (!Array.isArray(arr)) break;
        for (const it of arr) {
          if (isStr(it)) emit(it.v);
          else if (typeof it === 'number') {
            const adv = (-it / 1000) * ts.size * ts.th;
            tm = mul([1, 0, 0, 1, adv, 0], tm);
          }
        }
        break;
      }
      case 'Do': {
        const n = ops[0];
        if (!isName(n) || !xobjs) break;
        const ref = xobjs.m[n.v];
        const xo = ctx.doc.get(ref);
        if (!isStream(xo)) break;
        const sub = (xo.dict.m.Subtype as PName | undefined)?.v;
        if (sub === 'Image') {
          // Se ignoran máscaras y miniaturas diminutas.
          const w = Number(ctx.doc.get(xo.dict.m.Width)) || 0;
          const h = Number(ctx.doc.get(xo.dict.m.Height)) || 0;
          if (w * h > 64 * 64) ctx.imageRefs.add(isRef(ref) ? ref.n : `${n.v}:${ctx.imageRefs.size}`);
        } else if (sub === 'Form') {
          const mtx = ctx.doc.get(xo.dict.m.Matrix);
          const fm: M = Array.isArray(mtx) && mtx.length === 6 ? (mtx.map((x) => Number(ctx.doc.get(x)) || 0) as M) : ID;
          const res = ctx.doc.dictOf(xo.dict.m.Resources) ?? resources;
          const content = await ctx.doc.decode(xo);
          const saved = { tm, tlm };
          await runContent(ctx, content, res, mul(fm, ctm), depth + 1);
          tm = saved.tm;
          tlm = saved.tlm;
        }
        break;
      }
      case 'BI': {
        const id = s.indexOf('ID', lx.pos);
        const ei = id < 0 ? -1 : s.slice(id + 3).search(/\sEI(\s|$)/);
        lx.pos = id < 0 || ei < 0 ? s.length : id + 3 + ei + 3;
        ctx.imageRefs.add(`inline:${ctx.imageRefs.size}`);
        break;
      }
    }
    ops.length = 0;
  }
}

// ── Reconstrucción de líneas ───────────────────────────────────────────────

function buildLines(runs: PdfRun[], width: number): { lines: string[]; multiColumn: boolean } {
  const rs = runs.filter((r) => r.text.length).sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: PdfRun[][] = [];
  for (const r of rs) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g[0].y - r.y) <= Math.max(1.5, 0.45 * Math.min(g[0].size, r.size))) g.push(r);
    else groups.push([r]);
  }
  const lines: string[] = [];
  const starts: { x: number; text: string }[] = [];
  for (const g of groups) {
    g.sort((a, b) => a.x - b.x);
    // Segmentos: trozos de la línea separados por un espacio grande (posible columna o fecha alineada).
    const segs: { x: number; text: string }[] = [];
    let prev: PdfRun | null = null;
    for (const r of g) {
      const seg = segs[segs.length - 1];
      if (!prev || !seg) segs.push({ x: r.x, text: r.text });
      else {
        const gap = r.x - prev.xEnd;
        const size = Math.min(prev.size, r.size);
        if (gap > size * 2.5) segs.push({ x: r.x, text: r.text });
        else {
          if (gap > size * 0.12 && !seg.text.endsWith(' ') && !r.text.startsWith(' ')) seg.text += ' ';
          seg.text += r.text;
        }
      }
      prev = r;
    }
    for (const sg of segs) if (sg.text.trim().length >= 3) starts.push({ x: sg.x, text: sg.text.trim() });
    const clean = segs
      .map((sg) => sg.text.trim())
      .filter(Boolean)
      .join('   ');
    if (clean) lines.push(clean);
  }

  // Varias columnas: dos márgenes izquierdos frecuentes y bien separados. Las fechas alineadas a la
  // derecha no cuentan: empiezan en posiciones distintas y su texto parece una fecha.
  const DATE_LIKE = /^(?:[A-Za-zÁÉÍÓÚáéíóú.]{3,12}\s+)?\d{4}\s*[-–—]|^\d{1,2}\/\d{4}|^(?:[A-Za-zÁÉÍÓÚáéíóú.]{3,12}\s+)?\d{4}$|(present|presente|actualidad|actual|current)$/i;
  const buckets = new Map<number, { n: number; dates: number }>();
  for (const st of starts) {
    const b = Math.round(st.x / 6);
    const cur = buckets.get(b) ?? { n: 0, dates: 0 };
    cur.n++;
    if (st.text.length <= 32 && DATE_LIKE.test(st.text)) cur.dates++;
    buckets.set(b, cur);
  }
  const frequent = [...buckets.entries()]
    .map(([b, v]) => {
      const near = [buckets.get(b - 1), v, buckets.get(b + 1)];
      return { x: b * 6, n: near.reduce((a, c) => a + (c?.n ?? 0), 0), dates: near.reduce((a, c) => a + (c?.dates ?? 0), 0) };
    })
    .filter((b) => b.n >= 6 && b.dates / b.n < 0.5)
    .sort((a, b) => a.x - b.x);
  let multiColumn = false;
  if (frequent.length >= 2 && width > 0) {
    const left = frequent[0].x;
    multiColumn = frequent.some((b) => b.x - left > width * 0.22 && b.x < width * 0.82);
  }
  return { lines, multiColumn };
}

// ── API pública ────────────────────────────────────────────────────────────

export async function extractPdf(bytes: Uint8Array): Promise<PdfExtract> {
  const doc = new PdfDoc(bytes);
  if (!doc.bin.startsWith('%PDF') && doc.bin.indexOf('%PDF') > 1024) throw new Error('El archivo no es un PDF válido.');
  await doc.load();

  const trailerText = doc.bin.slice(Math.max(0, doc.bin.length - 4096));
  const encrypted = /\/Encrypt\s+\d+\s+\d+\s+R/.test(doc.bin) || /\/Encrypt\s*<</.test(trailerText);

  const info = (() => {
    const all = [...doc.bin.matchAll(/\/Info\s+(\d+)\s+\d+\s+R/g)];
    const last = all[all.length - 1];
    return last ? doc.dictOf({ t: 'ref', n: parseInt(last[1], 10) }) : undefined;
  })();
  const infoStr = (k: string) => {
    const v = doc.get(info?.m[k]);
    return isStr(v) ? pdfTextString(v.v).trim() : '';
  };

  // Páginas en orden, desde el catálogo
  const pages: { dict: PDict; res?: PDict; box: number[] }[] = [];
  const roots = [...doc.bin.matchAll(/\/Root\s+(\d+)\s+\d+\s+R/g)];
  const visit = (o: PObj | undefined, res: PDict | undefined, box: number[], depth: number) => {
    const d = doc.dictOf(o);
    if (!d || depth > 40 || pages.length > 300) return;
    const r = doc.dictOf(d.m.Resources) ?? res;
    const mb = doc.get(d.m.MediaBox);
    const b = Array.isArray(mb) ? mb.map((x) => Number(doc.get(x)) || 0) : box;
    const type = (doc.get(d.m.Type) as PName | undefined)?.v;
    const kids = doc.get(d.m.Kids);
    if (type === 'Pages' || Array.isArray(kids)) {
      if (Array.isArray(kids)) for (const k of kids) visit(k, r, b, depth + 1);
    } else pages.push({ dict: d, res: r, box: b });
  };
  if (roots.length) {
    const cat = doc.dictOf({ t: 'ref', n: parseInt(roots[roots.length - 1][1], 10) });
    visit(cat?.m.Pages, undefined, [0, 0, 612, 792], 0);
  }
  if (!pages.length) {
    for (const o of doc.objects.values()) {
      const d = isDict(o) ? o : undefined;
      if (d && (doc.get(d.m.Type) as PName | undefined)?.v === 'Page') {
        const mb = doc.get(d.m.MediaBox);
        pages.push({ dict: d, res: doc.dictOf(d.m.Resources), box: Array.isArray(mb) ? mb.map((x) => Number(doc.get(x)) || 0) : [0, 0, 612, 792] });
      }
    }
  }

  const ctx: Ctx = {
    doc,
    runs: [],
    imageRefs: new Set(),
    fontCache: new Map(),
    fontNames: new Set(),
    stats: { glyphs: 0, undecodable: 0 },
  };
  const outPages: PdfPage[] = [];
  for (const pg of pages) {
    ctx.runs = [];
    const contents = doc.get(pg.dict.m.Contents);
    const list = Array.isArray(contents) ? contents : contents ? [pg.dict.m.Contents] : [];
    const parts: Uint8Array[] = [];
    for (const c of list) {
      const st = doc.get(c);
      if (isStream(st)) parts.push(await doc.decode(st));
    }
    const total = parts.reduce((n, p) => n + p.length + 1, 0);
    const merged = new Uint8Array(total);
    let p = 0;
    for (const part of parts) {
      merged.set(part, p);
      p += part.length;
      merged[p++] = 10;
    }
    const [x0, y0, x1, y1] = pg.box.length === 4 ? pg.box : [0, 0, 612, 792];
    try {
      await runContent(ctx, merged, pg.res, [1, 0, 0, 1, -x0, -y0], 0);
    } catch {
      /* contenido dañado: seguimos con lo leído */
    }
    const width = Math.abs(x1 - x0);
    const { lines, multiColumn } = buildLines(ctx.runs, width);
    outPages.push({ width, height: Math.abs(y1 - y0), lines, multiColumn });
  }

  return {
    pages: outPages,
    text: outPages.map((pg) => pg.lines.join('\n')).join('\n\n'),
    images: ctx.imageRefs.size,
    fonts: [...ctx.fontNames].filter(Boolean),
    encrypted,
    producer: infoStr('Producer'),
    creator: infoStr('Creator'),
    title: infoStr('Title'),
    undecodable: ctx.stats.undecodable,
    glyphs: ctx.stats.glyphs,
  };
}
