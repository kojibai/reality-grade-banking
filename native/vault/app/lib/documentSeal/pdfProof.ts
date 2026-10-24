const textEncoder = new TextEncoder();
const latin1Decoder = new TextDecoder("latin1");

export const PDF_RECEIZ_UPDATE_MARKER = "%RECEIZ_SEAL_UPDATE_v1%";

type PdfRef = Readonly<{ obj: number; gen: number }>;

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function decodeLatin1(bytes: Uint8Array): string {
  return latin1Decoder.decode(bytes);
}

function encodeAscii(text: string): Uint8Array {
  return textEncoder.encode(text);
}

function lastRegexMatch(text: string, regex: RegExp): RegExpExecArray | null {
  let out: RegExpExecArray | null = null;
  regex.lastIndex = 0;
  let current = regex.exec(text);
  while (current) {
    out = current;
    current = regex.exec(text);
  }
  return out;
}

function parseLastRef(text: string, key: string): PdfRef | null {
  const re = new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R`, "g");
  const match = lastRegexMatch(text, re);
  if (!match) return null;
  const obj = Number.parseInt(match[1] ?? "", 10);
  const gen = Number.parseInt(match[2] ?? "", 10);
  if (!isFiniteInt(obj) || !isFiniteInt(gen)) return null;
  return { obj, gen };
}

function parseLastSize(text: string): number | null {
  const match = lastRegexMatch(text, /\/Size\s+(\d+)/g);
  if (!match) return null;
  const size = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(size) && size > 0 ? size : null;
}

function parseLastStartXref(text: string): number | null {
  const match = lastRegexMatch(text, /startxref\s+(\d+)/g);
  if (!match) return null;
  const start = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(start) && start >= 0 ? start : null;
}

function parseMaxObjectNumber(text: string): number {
  const objectRegex = /(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b/gm;
  let max = 0;
  let match = objectRegex.exec(text);
  while (match) {
    const value = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(value) && value > max) max = value;
    match = objectRegex.exec(text);
  }
  return max;
}

function escapePdfLiteralString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function decodePdfLiteralString(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i] ?? "";
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = value[i + 1] ?? "";
    i += 1;
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "\t";
    else if (next === "b") out += "\b";
    else if (next === "f") out += "\f";
    else out += next;
  }
  return out;
}

function readProofBundleLiteral(body: string): string | null {
  const literalMatch = /\/ProofBundle\s*\(([\s\S]*?)\)\s*(?:\/|>>)/.exec(body);
  if (literalMatch?.[1]) return decodePdfLiteralString(literalMatch[1]);

  const hexMatch = /\/ProofBundle\s*<([0-9A-Fa-f\s]+)>/.exec(body);
  if (!hexMatch?.[1]) return null;
  const normalized = hexMatch[1].replace(/\s+/g, "");
  if (normalized.length === 0 || normalized.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(normalized)) {
    return null;
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

export function stripReceizSealUpdatesFromPdf(pdfBytes: Uint8Array): { pdfBytes: Uint8Array; removedCount: number } {
  let current = pdfBytes;
  let removedCount = 0;

  while (true) {
    const text = decodeLatin1(current);
    const markerIndex = text.lastIndexOf(PDF_RECEIZ_UPDATE_MARKER);
    if (markerIndex < 0) break;
    let cutIndex = markerIndex;
    if (cutIndex > 0 && text[cutIndex - 1] === "\n") cutIndex -= 1;
    if (cutIndex > 0 && text[cutIndex - 1] === "\r") cutIndex -= 1;
    current = current.slice(0, cutIndex);
    removedCount += 1;
  }

  return { pdfBytes: current, removedCount };
}

export function extractReceizProofBundlesFromPdf(pdfBytes: Uint8Array): string[] {
  const text = decodeLatin1(pdfBytes);
  const objectRegex = /(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/gm;
  const encodedBundles: string[] = [];
  let match = objectRegex.exec(text);
  while (match) {
    const body = match[3] ?? "";
    if (/\/Type\s*\/ReceizProof\b/.test(body)) {
      const encoded = readProofBundleLiteral(body);
      if (encoded) encodedBundles.push(encoded);
    }
    match = objectRegex.exec(text);
  }
  return encodedBundles;
}

function padXrefOffset(offset: number): string {
  return String(Math.max(0, offset)).padStart(10, "0");
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

export function embedReceizProofBundleIntoPdf(args: { pdfBytes: Uint8Array; encodedBundle: string }): Uint8Array {
  if (!isPdfBytes(args.pdfBytes)) {
    throw new Error("Not a PDF.");
  }

  const text = decodeLatin1(args.pdfBytes);
  const rootRef = parseLastRef(text, "Root");
  const lastStartXref = parseLastStartXref(text);
  if (!rootRef || lastStartXref === null) {
    throw new Error("Unsupported PDF structure: missing root or startxref.");
  }

  const existingInfoRef = parseLastRef(text, "Info");
  const size = parseLastSize(text);
  const maxObjectNumber = parseMaxObjectNumber(text);
  const nextObjectNumber = Math.max(size ?? 0, maxObjectNumber + 1, 1);
  const proofObjectNumber = nextObjectNumber;
  const infoObjectNumber = nextObjectNumber + 1;
  const trailerSize = Math.max(size ?? 0, infoObjectNumber + 1);

  const escapedBundle = escapePdfLiteralString(args.encodedBundle);
  const prefix = encodeAscii(`\n${PDF_RECEIZ_UPDATE_MARKER}\n`);
  const proofObject = encodeAscii(
    `${proofObjectNumber} 0 obj\n<< /Type /ReceizProof /Version 1 /ProofBundle (${escapedBundle}) >>\nendobj\n`
  );
  const infoObject = encodeAscii(
    `${infoObjectNumber} 0 obj\n<< /ReceizProof ${proofObjectNumber} 0 R${
      existingInfoRef ? ` /PrevInfo ${existingInfoRef.obj} ${existingInfoRef.gen} R` : ""
    } >>\nendobj\n`
  );

  const baseLength = args.pdfBytes.length;
  const proofOffset = baseLength + prefix.length;
  const infoOffset = proofOffset + proofObject.length;
  const xrefOffset = infoOffset + infoObject.length;

  const xrefSection = encodeAscii(
    `xref\n${proofObjectNumber} 2\n${padXrefOffset(proofOffset)} 00000 n \n${padXrefOffset(infoOffset)} 00000 n \n`
  );
  const trailerSection = encodeAscii(
    `trailer\n<< /Size ${trailerSize} /Root ${rootRef.obj} ${rootRef.gen} R /Info ${infoObjectNumber} 0 R /Prev ${lastStartXref} >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return concatBytes([args.pdfBytes, prefix, proofObject, infoObject, xrefSection, trailerSection]);
}
