import { sha256Hex } from "./verifier/crypto.js";

export type ReceizPbiSignatureMode = "OWNER_SELF" | "INVITE_RECEIVER";
export type ReceizPngTextChunk = Readonly<{ keyword: string; text: string }>;

const HEX_64_RE = /^[0-9a-f]{64}$/;
const CODE_RE = /^[A-Z0-9]{8}$/;
const SLUG_RE = /^\d{8}_\d{4}$/;

const PIXEL_GLYPHS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "001", "001", "001"],
  "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"],
  a: ["010", "101", "111", "101", "101"], b: ["110", "101", "110", "101", "110"],
  c: ["111", "100", "100", "100", "111"], d: ["110", "101", "101", "101", "110"],
  e: ["111", "100", "111", "100", "111"], f: ["111", "100", "111", "100", "100"],
  g: ["111", "100", "101", "101", "111"], h: ["101", "101", "111", "101", "101"],
  i: ["111", "010", "010", "010", "111"], m: ["101", "111", "111", "101", "101"],
  n: ["101", "111", "111", "101", "101"], o: ["111", "101", "101", "101", "111"],
  p: ["110", "101", "110", "100", "100"], r: ["110", "101", "110", "101", "101"],
  s: ["111", "100", "111", "001", "111"], u: ["101", "101", "101", "101", "111"],
  v: ["101", "101", "101", "101", "010"], ":": ["0", "1", "0", "1", "0"],
  " ": ["0", "0", "0", "0", "0"],
});

function gcd(a: number, b: number): number {
  let x = Math.abs(a); let y = Math.abs(b);
  while (y !== 0) { const next = x % y; x = y; y = next; }
  return x;
}

function pickInt(seedHex: string, start: number, length: number, min: number, max: number): number {
  const value = Number.parseInt(seedHex.slice(start, start + length).padEnd(length, "0"), 16);
  return min + (value % (max - min + 1));
}

function sigMarkPathFromHex(seedHex: string, w: number, h: number): string {
  const safeSeed = seedHex.toLowerCase();
  const R = pickInt(safeSeed, 0, 6, 62, 84); const r = pickInt(safeSeed, 6, 6, 18, 38);
  const d = pickInt(safeSeed, 12, 6, 16, 36); const turns = Math.max(7, pickInt(safeSeed, 18, 4, 9, 14));
  const period = (Math.PI * 2 * r) / gcd(R, r); const samples = pickInt(safeSeed, 22, 4, 560, 860);
  const points: Array<{ x: number; y: number }> = [];
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (let i = 0; i < samples; i += 1) {
    const t = (period * turns * i) / (samples - 1);
    const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    points.push({ x, y });
  }
  const pad = Math.max(3, Math.min(w, h) * 0.08); const spanX = Math.max(1e-6, maxX - minX); const spanY = Math.max(1e-6, maxY - minY);
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY); const offsetX = (w - spanX * scale) / 2; const offsetY = (h - spanY * scale) / 2;
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${(offsetX + (point.x - minX) * scale).toFixed(2)} ${(offsetY + (point.y - minY) * scale).toFixed(2)}`).join(" ");
}

function glyphPath(text: string, x: number, y: number, scale: number): string {
  const commands: string[] = []; let cursor = x;
  for (const ch of text.toLowerCase()) {
    const pattern = PIXEL_GLYPHS[ch] ?? PIXEL_GLYPHS[" "]!;
    for (let row = 0; row < pattern.length; row += 1) for (let col = 0; col < (pattern[0]?.length ?? 0); col += 1) {
      if (pattern[row]?.[col] === "1") { const px = (cursor + col * scale).toFixed(2); const py = (y + row * scale).toFixed(2); const size = scale.toFixed(2); commands.push(`M${px} ${py}h${size}v${size}h-${size}z`); }
    }
    cursor += ((pattern[0]?.length ?? 0) + 1) * scale;
  }
  return commands.join(" ");
}

export async function deriveReceizPbiBadgeIdentity(input: { signerIdentity: string; pbiReceiptHash: string }): Promise<Readonly<{ signerId: string; signerShort: string; userSigKey: string; pbiShort: string }>> {
  const signerIdentity = input.signerIdentity.trim(); const pbiReceiptHash = input.pbiReceiptHash.trim().toLowerCase();
  if (!signerIdentity || !HEX_64_RE.test(pbiReceiptHash)) throw new Error("receiz_pbi_badge_identity_invalid");
  const signerId = await sha256Hex(`PBI_SIGNER_V1:${signerIdentity}:${pbiReceiptHash}`);
  const userSigKey = await sha256Hex(`RECEIZ_SIG_V1:${signerIdentity}`);
  return Object.freeze({ signerId, signerShort: signerId.slice(0, 12), userSigKey, pbiShort: pbiReceiptHash.slice(0, 16) });
}

export function buildReceizPbiSignedOverlaySvg(input: { width: number; userSigKey: string; signerShort: string; pbiShort: string }): string {
  if (!Number.isFinite(input.width) || input.width <= 0 || !HEX_64_RE.test(input.userSigKey) || !/^[a-f0-9]{12}$/.test(input.signerShort) || !/^[a-f0-9]{16}$/.test(input.pbiShort)) throw new Error("receiz_pbi_badge_input_invalid");
  const panelWidth = 340; const panelHeight = 104; const x = Math.max(20, input.width - panelWidth - 24); const y = 20;
  const sigPath = sigMarkPathFromHex(input.userSigKey, 106, 74);
  const signedPath = glyphPath("SIGNED", 140, 26, 3); const humanPath = glyphPath("HUMAN ORIGIN VERIFIED", 140, 44, 2);
  const signerPath = glyphPath(`signer:${input.signerShort}`, 140, 56, 2.05); const pbiPath = glyphPath(`pbi:${input.pbiShort}`, 140, 78, 2.05);
  return `
<svg width="${input.width}" height="180" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sigStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#22d3ee" stop-opacity="0.45" /><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.45" /></linearGradient></defs>
  <g transform="translate(${x},${y})">
    <rect x="0" y="0" rx="14" ry="14" width="${panelWidth}" height="${panelHeight}" fill="rgba(255,255,255,0.93)" stroke="rgba(17,17,17,0.25)" />
    <rect x="16" y="16" rx="10" ry="10" width="106" height="74" fill="rgba(255,255,255,0.55)" stroke="rgba(17,17,17,0.12)" />
    <path d="${sigPath}" transform="translate(16,16)" fill="none" stroke="url(#sigStroke)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${signedPath}" fill="#111111" fill-opacity="0.96" />
    <path d="${humanPath}" fill="#111111" fill-opacity="0.78" />
    <path d="${signerPath}" fill="#111111" fill-opacity="0.87" />
    <path d="${pbiPath}" fill="#111111" fill-opacity="0.87" />
    <circle cx="${panelWidth - 17}" cy="17" r="4" fill="#111111" fill-opacity="0.78" />
  </g>
</svg>
`;
}

export function buildReceizPbiSignatureChunks(input: { signerId: string; pbiReceiptHash: string; claimHashHex: string; slug: string; code: string; pulse: string; createdAtIso: string; userSigKey: string; signerEmail?: string | null; signatureMode: ReceizPbiSignatureMode; inviteId?: string | null }): readonly ReceizPngTextChunk[] {
  const signerId = input.signerId.trim().toLowerCase(); const pbiReceiptHash = input.pbiReceiptHash.trim().toLowerCase(); const claimHashHex = input.claimHashHex.trim().toLowerCase();
  if (!HEX_64_RE.test(signerId) || !HEX_64_RE.test(pbiReceiptHash) || !HEX_64_RE.test(claimHashHex) || !HEX_64_RE.test(input.userSigKey) || !SLUG_RE.test(input.slug) || !CODE_RE.test(input.code) || !/^\d{1,64}$/.test(input.pulse) || !Number.isFinite(Date.parse(input.createdAtIso))) throw new Error("receiz_pbi_signature_chunks_invalid");
  const chunks: ReceizPngTextChunk[] = [
    { keyword: "receiz.signature.kind", text: "PBI" }, { keyword: "receiz.signature.signer_id", text: signerId },
    { keyword: "receiz.signature.pbi_receipt_hash", text: pbiReceiptHash }, { keyword: "receiz.signature.claim_hash", text: claimHashHex },
    { keyword: "receiz.signature.slug", text: `slug=${input.slug} code=${input.code} pulse=${input.pulse}` }, { keyword: "receiz.signature.created_at", text: input.createdAtIso },
    { keyword: "receiz.signature.user_key", text: input.userSigKey }, { keyword: "receiz.signature.mode", text: input.signatureMode },
  ];
  const signerEmail = input.signerEmail?.trim().toLowerCase(); if (signerEmail) chunks.push({ keyword: "receiz.signature.signer_email", text: signerEmail });
  const inviteId = input.inviteId?.trim(); if (inviteId) chunks.push({ keyword: "receiz.signature.invite_id", text: inviteId });
  return Object.freeze(chunks.map((chunk) => Object.freeze({ ...chunk })));
}
