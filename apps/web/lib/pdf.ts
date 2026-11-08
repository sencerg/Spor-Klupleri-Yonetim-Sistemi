import { deflateSync } from "zlib";
import { existsSync, readFileSync } from "fs";
import path from "path";
import type { RollReport } from "./roll-report";
import { rankText } from "./roll-report";

type FontFace = {
  bytes: Buffer;
  units: number;
  ascent: number;
  descent: number;
  bbox: [number, number, number, number];
  glyph: (code: number) => number;
  advance: (glyph: number) => number;
};

const encoder = new TextEncoder();

function u16(data: Buffer, offset: number) {
  return data.readUInt16BE(offset);
}

function i16(data: Buffer, offset: number) {
  return data.readInt16BE(offset);
}

function u32(data: Buffer, offset: number) {
  return data.readUInt32BE(offset);
}

function table(data: Buffer, tag: string) {
  const count = u16(data, 4);
  for (let index = 0; index < count; index += 1) {
    const at = 12 + index * 16;
    if (data.toString("latin1", at, at + 4) === tag) return { offset: u32(data, at + 8), length: u32(data, at + 12) };
  }
  throw new Error(`${tag} tablosu yok`);
}

function parseFont(data: Buffer): FontFace {
  const cmap = table(data, "cmap");
  const tables = u16(data, cmap.offset + 2);
  let format4 = 0;
  for (let index = 0; index < tables; index += 1) {
    const at = cmap.offset + 4 + index * 8;
    const platform = u16(data, at);
    const encoding = u16(data, at + 2);
    const sub = cmap.offset + u32(data, at + 4);
    const format = u16(data, sub);
    if (format === 4 && ((platform === 3 && encoding === 1) || platform === 0)) format4 = sub;
  }
  if (!format4) throw new Error("Yazı tipi eşlemesi yok");
  const segCount = u16(data, format4 + 6) / 2;
  const endAt = format4 + 14;
  const startAt = endAt + segCount * 2 + 2;
  const deltaAt = startAt + segCount * 2;
  const rangeAt = deltaAt + segCount * 2;
  const glyph = (code: number) => {
    for (let index = 0; index < segCount; index += 1) {
      const end = u16(data, endAt + index * 2);
      const start = u16(data, startAt + index * 2);
      if (code < start || code > end) continue;
      const delta = i16(data, deltaAt + index * 2);
      const range = u16(data, rangeAt + index * 2);
      if (range === 0) return (code + delta) & 0xffff;
      const address = rangeAt + index * 2 + range + (code - start) * 2;
      const found = u16(data, address);
      return found === 0 ? 0 : (found + delta) & 0xffff;
    }
    return 0;
  };
  const head = table(data, "head");
  const hhea = table(data, "hhea");
  const hmtx = table(data, "hmtx");
  const metrics = u16(data, hhea.offset + 34);
  const last = metrics ? u16(data, hmtx.offset + (metrics - 1) * 4) : 500;
  return {
    bytes: data,
    units: u16(data, head.offset + 18) || 1000,
    ascent: i16(data, hhea.offset + 4),
    descent: i16(data, hhea.offset + 6),
    bbox: [i16(data, head.offset + 36), i16(data, head.offset + 38), i16(data, head.offset + 40), i16(data, head.offset + 42)],
    glyph,
    advance(id: number) {
      if (id > 0 && id < metrics) return u16(data, hmtx.offset + id * 4);
      return last;
    },
  };
}

function fontFile() {
  const candidates = [
    path.join(process.cwd(), "apps/web/lib/fonts/NotoSans-Regular.ttf"),
    path.join(process.cwd(), "lib/fonts/NotoSans-Regular.ttf"),
  ];
  return candidates.find((item) => existsSync(item)) ?? candidates[0];
}

let face: FontFace | null = null;
function font() {
  face ??= parseFont(readFileSync(fontFile()));
  return face;
}

function widthOf(text: string, size: number) {
  const used = font();
  let width = 0;
  for (const char of text) width += (used.advance(used.glyph(char.codePointAt(0) ?? 0)) * size) / used.units;
  return width;
}

function hexOf(text: string, used: Map<number, string>) {
  const source = font();
  let hex = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const id = source.glyph(code) || source.glyph(32);
    used.set(id, id === source.glyph(32) && code !== 32 ? " " : char);
    hex += id.toString(16).padStart(4, "0");
  }
  return hex;
}

function wrap(text: string, size: number, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && widthOf(next, size) > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function rollPdf(report: RollReport, title: string, range: string) {
  const used = new Map<number, string>();
  const pages: string[] = [];
  let ops: string[] = [];
  let y = 800;
  const paint = (block: string) => ops.push(block);
  const text = (value: string, x: number, baseline: number, size: number, color = "0.07 0.10 0.26") => {
    paint(`${color} rg BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${baseline.toFixed(1)} Tm <${hexOf(value, used)}> Tj ET`);
  };
  const rect = (x: number, top: number, w: number, h: number, color: string) => {
    paint(`${color} rg ${x.toFixed(1)} ${(top - h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  };
  const header = () => {
    rect(0, 842, 595, 36, "0.784 0.063 0.180");
    text("Yoklama raporu", 36, 816, 14, "1 1 1");
    text(range, 250, 816, 10, "1 1 1");
    y = 790;
  };
  const page = () => {
    if (ops.length) pages.push(ops.join("\n"));
    ops = [];
    header();
  };
  const need = (height: number) => {
    if (y - height < 42) page();
  };
  const line = (value: string, size: number, gap: number, color?: string) => {
    for (const row of wrap(value, size, 520)) {
      need(gap);
      text(row, 36, y - size, size, color);
      y -= gap;
    }
  };
  const bar = (rate: number | null) => {
    rect(400, y + 2, 150, 8, "0.91 0.93 0.96");
    if (rate != null) rect(400, y + 2, Math.max(2, (150 * rate) / 100), 8, "0.784 0.063 0.180");
  };

  page();
  line(title, 12, 18);
  line("İşaretlenmeyen seans katılım sayısına yazılmaz.", 9, 16, "0.35 0.4 0.48");
  if (!report.teams.length) line("Bu aralıkta seans yok.", 11, 16);

  line("Takımlar", 13, 18);
  for (const team of report.teams) {
    need(36);
    text(team.name, 36, y - 11, 11);
    text(team.rate == null ? "—" : `%${team.rate}`, 360, y - 11, 10);
    bar(team.rate);
    y -= 16;
    line(`${team.present} katılım · ${team.sessions} seans · ${team.players} sporcu`, 9, 13, "0.35 0.4 0.48");
    line(`En çok: ${rankText(team.most)}`, 9, 12);
    line(`En az: ${rankText(team.least)}`, 9, 14);
    for (const player of report.players.filter((item) => item.teamId === team.id)) {
      need(14);
      text(player.name, 48, y - 9, 9);
      text(player.sessions ? `${player.present}/${player.sessions}` : "—", 300, y - 9, 9);
      text(player.rate == null ? "—" : `%${player.rate}`, 350, y - 9, 9);
      y -= 13;
    }
    y -= 6;
  }

  line("Branşlar", 13, 18);
  for (const sport of report.sports) {
    need(34);
    text(sport.name, 36, y - 11, 11);
    text(sport.rate == null ? "—" : `%${sport.rate}`, 360, y - 11, 10);
    bar(sport.rate);
    y -= 16;
    line(`${sport.present} katılım · ${sport.sessions} seans`, 9, 13, "0.35 0.4 0.48");
    line(`En çok: ${rankText(sport.most)}`, 9, 12);
    line(`En az: ${rankText(sport.least)}`, 9, 16);
  }
  if (ops.length) pages.push(ops.join("\n"));
  return pack(pages, used);
}

function pack(pages: string[], used: Map<number, string>) {
  const source = font();
  const compressed = deflateSync(source.bytes);
  const chunks: { body: Uint8Array }[] = [];
  const add = (body: string | Uint8Array) => chunks.push({ body: typeof body === "string" ? encoder.encode(body) : body });
  const bfchar = [...used.entries()];
  const maps: string[] = [];
  for (let index = 0; index < bfchar.length; index += 100) {
    const slice = bfchar.slice(index, index + 100);
    maps.push(`${slice.length} beginbfchar`);
    for (const [id, char] of slice) {
      const code = char.codePointAt(0) ?? 32;
      maps.push(`<${id.toString(16).padStart(4, "0")}> <${code.toString(16).padStart(4, "0")}>`);
    }
    maps.push("endbfchar");
  }
  const unicode = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
${maps.join("\n")}
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
  const widths = [...used.keys()].map((id) => `${id} [${Math.round((source.advance(id) * 1000) / source.units)}]`).join(" ");
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] >>`);
  pages.forEach((content, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentId} 0 R >>`);
    const stream = encoder.encode(content);
    add(`<< /Length ${stream.length} >>\nstream\n${content}\nendstream`);
  });
  const fontId = 3 + pages.length * 2;
  add(`<< /Type /Font /Subtype /Type0 /BaseFont /NotoSans /Encoding /Identity-H /DescendantFonts [${fontId + 1} 0 R] /ToUnicode ${fontId + 2} 0 R >>`);
  add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fontId + 3} 0 R /CIDToGIDMap /Identity /DW 500 /W [${widths}] >>`);
  const uni = encoder.encode(unicode);
  add(`<< /Length ${uni.length} >>\nstream\n${unicode}\nendstream`);
  add(`<< /Type /FontDescriptor /FontName /NotoSans /Flags 32 /FontBBox [${source.bbox.join(" ")}] /ItalicAngle 0 /Ascent ${source.ascent} /Descent ${source.descent} /CapHeight ${source.ascent} /StemV 80 /FontFile2 ${fontId + 4} 0 R >>`);
  add(`<< /Length ${compressed.length} /Length1 ${source.bytes.length} /Filter /FlateDecode >>\nstream\n`);
  const objects: Uint8Array[] = [];
  let cursor = encoder.encode("%PDF-1.4\n").length;
  const offsets = [0];
  const head = encoder.encode("%PDF-1.4\n");
  objects.push(head);
  chunks.forEach((chunk, index) => {
    const id = index + 1;
    const prefix = encoder.encode(`${id} 0 obj\n`);
    const suffix = encoder.encode(id === chunks.length ? "\nendstream\nendobj\n" : "\nendobj\n");
    const body = id === chunks.length ? concat([chunk.body, compressed]) : chunk.body;
    offsets.push(cursor);
    const whole = concat([prefix, body, suffix]);
    objects.push(whole);
    cursor += whole.length;
  });
  const xrefAt = cursor;
  const xref = encoder.encode(`xref\n0 ${offsets.length}\n${offsets.map((offset, index) => index === 0 ? "0000000000 65535 f \n" : `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`);
  objects.push(xref);
  return concat(objects);
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
