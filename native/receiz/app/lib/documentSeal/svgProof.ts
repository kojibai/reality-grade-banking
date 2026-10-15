const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const RECEIZ_SVG_ATTR = "data-receiz-proof-bundle";
const RECEIZ_SVG_ID = "receiz-proof-bundle";
const SVG_CLOSE_TAG_RE = /<\/svg\s*>/i;

function proofTagRegex(): RegExp {
  return new RegExp(
    `<metadata\\b[^>]*\\b${RECEIZ_SVG_ATTR}\\s*=\\s*(["'])([^"']+)\\1[^>]*>(?:[\\s\\S]*?<\\/metadata\\s*>)?`,
    "gi",
  );
}

function decodeURIComponentSafe(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isSupportedBundleCodec(value: string): boolean {
  return value.startsWith("c1:") || value.startsWith("j0:");
}

function normalizeEncodedBundleValue(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "");
  const candidates = [raw.trim(), compact];
  for (const candidate of candidates) {
    if (isSupportedBundleCodec(candidate)) return candidate;
    const decoded = decodeURIComponentSafe(candidate);
    if (decoded && isSupportedBundleCodec(decoded)) return decoded;
  }
  return null;
}

type StripResult = Readonly<{
  basisText: string;
  basisBytes: Uint8Array;
  removedCount: number;
  encodedBundles: readonly string[];
}>;

function stripReceizSvgProofTags(svgBytes: Uint8Array): StripResult {
  const svgText = textDecoder.decode(svgBytes);
  const encodedBundles: string[] = [];
  let removedCount = 0;
  const regex = proofTagRegex();
  let strippedText = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(svgText))) {
    const full = match[0] ?? "";
    const encoded = match[2] ?? "";
    const matchIndex = match.index;
    let removeStart = matchIndex;

    // Legacy SVG embedding inserted a single "\n" before the proof tag.
    // Remove that injected byte so basis hashing recovers the exact pre-sealed bytes.
    if (removeStart > 0 && svgText.charCodeAt(removeStart - 1) === 0x0a) {
      removeStart -= 1;
    }

    strippedText += svgText.slice(cursor, removeStart);
    cursor = matchIndex + full.length;
    removedCount += 1;
    encodedBundles.push(String(encoded));
  }
  strippedText += svgText.slice(cursor);

  return {
    basisText: strippedText,
    basisBytes: textEncoder.encode(strippedText),
    removedCount,
    encodedBundles,
  };
}

export type ParsedReceizSvgProof = Readonly<{
  proofCount: number;
  basisBytes: Uint8Array;
  encodedBundle: string | null;
  parseError: string | null;
}>;

export function parseReceizSvgProof(svgBytes: Uint8Array): ParsedReceizSvgProof {
  const stripped = stripReceizSvgProofTags(svgBytes);
  if (stripped.removedCount === 0) {
    return { proofCount: 0, basisBytes: stripped.basisBytes, encodedBundle: null, parseError: "missing_svg_proof" };
  }

  if (stripped.removedCount > 1) {
    return {
      proofCount: stripped.removedCount,
      basisBytes: stripped.basisBytes,
      encodedBundle: null,
      parseError: "duplicate_svg_proof",
    };
  }

  const encodedBundle = normalizeEncodedBundleValue(stripped.encodedBundles[0] ?? "");
  if (!encodedBundle) {
    return { proofCount: 1, basisBytes: stripped.basisBytes, encodedBundle: null, parseError: "invalid_svg_proof" };
  }

  return {
    proofCount: 1,
    basisBytes: stripped.basisBytes,
    encodedBundle,
    parseError: null,
  };
}

export function embedReceizProofBundleIntoSvg(args: {
  svgBytes: Uint8Array;
  encodedBundle: string;
}): { svgBytes: Uint8Array; removedCount: number } {
  const stripped = stripReceizSvgProofTags(args.svgBytes);
  const closeMatch = SVG_CLOSE_TAG_RE.exec(stripped.basisText);
  if (!closeMatch || closeMatch.index < 0) {
    throw new Error("SVG is missing a closing </svg> tag.");
  }

  const insertAt = closeMatch.index;
  const proofTag = `\n<metadata id="${RECEIZ_SVG_ID}" ${RECEIZ_SVG_ATTR}="${args.encodedBundle}"/>`;
  const nextText = `${stripped.basisText.slice(0, insertAt)}${proofTag}${stripped.basisText.slice(insertAt)}`;
  return {
    svgBytes: textEncoder.encode(nextText),
    removedCount: stripped.removedCount,
  };
}
