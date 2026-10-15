const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const JSON_WS_PREFIX = "\r\n\t \t\t \r\n";
const JSON_WS_SUFFIX = "\r\n \t\t \t\r\n";
const JSON_WS_PREFIX_LF = JSON_WS_PREFIX.replace(/\r\n/g, "\n");
const JSON_WS_SUFFIX_LF = JSON_WS_SUFFIX.replace(/\r\n/g, "\n");

type JsonWhitespaceChannel = Readonly<{
  prefix: string;
  suffix: string;
}>;

const JSON_WS_CHANNELS: readonly JsonWhitespaceChannel[] = (() => {
  const out: JsonWhitespaceChannel[] = [{ prefix: JSON_WS_PREFIX, suffix: JSON_WS_SUFFIX }];
  if (JSON_WS_PREFIX_LF !== JSON_WS_PREFIX || JSON_WS_SUFFIX_LF !== JSON_WS_SUFFIX) {
    out.push({ prefix: JSON_WS_PREFIX_LF, suffix: JSON_WS_SUFFIX_LF });
  }
  return out;
})();

type StripResult = Readonly<{
  basisText: string;
  basisBytes: Uint8Array;
  removedCount: number;
  encodedBundles: readonly string[];
  parseError: string | null;
}>;

function encodeWhitespaceBits(bytes: Uint8Array): string {
  let out = "";
  for (const value of bytes) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      out += ((value >> bit) & 1) === 1 ? "\t" : " ";
    }
  }
  return out;
}

function decodeWhitespaceBits(bits: string): Uint8Array | null {
  if (bits.length % 8 !== 0) return null;
  const out = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) {
      const ch = bits[i + j];
      if (ch !== " " && ch !== "\t") return null;
      value = (value << 1) | (ch === "\t" ? 1 : 0);
    }
    out[i / 8] = value;
  }
  return out;
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

function normalizeEncodedBundleToken(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "");
  const candidates = [raw.trim(), compact];
  for (const candidate of candidates) {
    if (isSupportedBundleCodec(candidate)) return candidate;
    const decoded = decodeURIComponentSafe(candidate);
    if (decoded && isSupportedBundleCodec(decoded)) return decoded;
  }
  return null;
}

function packBundlePayload(encodedBundle: string): Uint8Array {
  const payloadText = textEncoder.encode(encodedBundle);
  const out = new Uint8Array(4 + payloadText.length);
  out[0] = (payloadText.length >>> 24) & 0xff;
  out[1] = (payloadText.length >>> 16) & 0xff;
  out[2] = (payloadText.length >>> 8) & 0xff;
  out[3] = payloadText.length & 0xff;
  out.set(payloadText, 4);
  return out;
}

function unpackBundlePayload(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;
  const size =
    (((bytes[0] ?? 0) << 24) >>> 0) + ((bytes[1] ?? 0) << 16) + ((bytes[2] ?? 0) << 8) + (bytes[3] ?? 0);
  if (size !== bytes.length - 4) return null;
  return normalizeEncodedBundleToken(textDecoder.decode(bytes.slice(4)));
}

type TrailingProofLookup = Readonly<
  | {
      ok: true;
      prefixStart: number;
      encodedBundle: string;
    }
  | {
      ok: false;
      parseError: string;
    }
>;

function findTrailingJsonProof(current: string, channel: JsonWhitespaceChannel): TrailingProofLookup {
  const suffixStart = current.length - channel.suffix.length;
  let prefixStart = current.lastIndexOf(channel.prefix, suffixStart - 1);

  let sawPrefix = false;
  let sawInvalidBits = false;
  let sawInvalidPayload = false;

  while (prefixStart >= 0) {
    sawPrefix = true;
    const bits = current.slice(prefixStart + channel.prefix.length, suffixStart);
    const payloadBytes = decodeWhitespaceBits(bits);
    if (!payloadBytes) {
      sawInvalidBits = true;
      prefixStart = current.lastIndexOf(channel.prefix, prefixStart - 1);
      continue;
    }

    const encodedBundle = unpackBundlePayload(payloadBytes);
    if (!encodedBundle) {
      sawInvalidPayload = true;
      prefixStart = current.lastIndexOf(channel.prefix, prefixStart - 1);
      continue;
    }

    return {
      ok: true,
      prefixStart,
      encodedBundle,
    };
  }

  if (!sawPrefix) {
    return { ok: false, parseError: "missing_json_whitespace_proof_prefix" };
  }
  if (sawInvalidPayload) {
    return { ok: false, parseError: "invalid_json_whitespace_payload" };
  }
  if (sawInvalidBits) {
    return { ok: false, parseError: "invalid_json_whitespace_bits" };
  }
  return { ok: false, parseError: "invalid_json_proof" };
}

function detectTrailingJsonChannel(current: string): JsonWhitespaceChannel | null {
  for (const channel of JSON_WS_CHANNELS) {
    if (current.endsWith(channel.suffix)) return channel;
  }
  return null;
}

function stripReceizJsonProof(jsonBytes: Uint8Array): StripResult {
  let current = textDecoder.decode(jsonBytes);
  const encodedBundles: string[] = [];
  let removedCount = 0;
  let parseError: string | null = null;

  while (true) {
    const channel = detectTrailingJsonChannel(current);
    if (!channel) break;

    const trailingProof = findTrailingJsonProof(current, channel);
    if (!trailingProof.ok) {
      if (trailingProof.parseError === "missing_json_whitespace_proof_prefix") {
        break;
      }
      parseError = trailingProof.parseError;
      break;
    }

    encodedBundles.push(trailingProof.encodedBundle);
    removedCount += 1;
    current = current.slice(0, trailingProof.prefixStart);
  }

  return {
    basisText: current,
    basisBytes: textEncoder.encode(current),
    removedCount,
    encodedBundles,
    parseError,
  };
}

export type ParsedReceizJsonProof = Readonly<{
  proofCount: number;
  basisBytes: Uint8Array;
  encodedBundle: string | null;
  parseError: string | null;
}>;

export function parseReceizJsonProof(jsonBytes: Uint8Array): ParsedReceizJsonProof {
  const stripped = stripReceizJsonProof(jsonBytes);
  if (stripped.parseError) {
    return {
      proofCount: stripped.removedCount,
      basisBytes: stripped.basisBytes,
      encodedBundle: null,
      parseError: stripped.parseError,
    };
  }
  if (stripped.removedCount === 0) {
    return { proofCount: 0, basisBytes: stripped.basisBytes, encodedBundle: null, parseError: "missing_json_proof" };
  }
  if (stripped.removedCount > 1) {
    return {
      proofCount: stripped.removedCount,
      basisBytes: stripped.basisBytes,
      encodedBundle: null,
      parseError: "duplicate_json_proof",
    };
  }
  const encodedBundle = stripped.encodedBundles[0] ?? null;
  return {
    proofCount: 1,
    basisBytes: stripped.basisBytes,
    encodedBundle,
    parseError: encodedBundle ? null : "invalid_json_proof",
  };
}

export function embedReceizProofBundleIntoJson(args: {
  jsonBytes: Uint8Array;
  encodedBundle: string;
}): { jsonBytes: Uint8Array; removedCount: number } {
  const stripped = stripReceizJsonProof(args.jsonBytes);
  if (stripped.parseError) {
    throw new Error(`Existing JSON proof marker is malformed (${stripped.parseError}).`);
  }

  const payload = packBundlePayload(args.encodedBundle);
  const whitespacePayload = encodeWhitespaceBits(payload);
  const out = `${stripped.basisText}${JSON_WS_PREFIX}${whitespacePayload}${JSON_WS_SUFFIX}`;
  return {
    jsonBytes: textEncoder.encode(out),
    removedCount: stripped.removedCount,
  };
}
