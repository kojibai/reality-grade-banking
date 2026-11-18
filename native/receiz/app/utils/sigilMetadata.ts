import type {SigilMetadataLite, SigilTransfer} from "./valuation";
import { XMLParser } from "fast-xml-parser";
import { gunzipB64 } from "../lib/sigil/codec";
import type {
  BundleRoot,
  ProofBundleBindings,
  ProofBundleTransport,
  ProofCapsuleV1,
  VerificationSource,
  ZkMeta,
  ZkStatement,
} from "../components/KaiVoh/verifierProof";
import type { AuthorSig } from "./authorSig";
import { parseAuthorSig } from "./authorSig";
import type { ReceiveSig } from "./webauthnReceive";
import { isReceiveSig } from "./webauthnReceive";
import type { OwnerKeyDerivation } from "./ownerPhiKey";
import type { VerificationCache } from "./verificationCache";
import type { VerificationReceipt, VerificationSig } from "./verificationReceipt";

export type EmbeddedMeta = {
  pulse?: number;
  pulseExact?: string;
  beat?: number;
  stepIndex?: number;
  frequencyHz?: number;
  chakraDay?: string;
  chakraGate?: string;
  kaiSignature?: string;
  phiKey?: string;
  timestamp?: string;
  shareUrl?: string;
  verifierUrl?: string;
  verifier?: VerificationSource;
  verificationVersion?: string;
  verifiedAtPulse?: number;
  proofCapsule?: ProofCapsuleV1;
  capsuleHash?: string;
  svgHash?: string;
  bundleHash?: string;
  hashAlg?: string;
  canon?: string;
  bindings?: ProofBundleBindings;
  zkStatement?: ZkStatement;
  bundleRoot?: BundleRoot;
  zkMeta?: ZkMeta;
  verificationCache?: VerificationCache;
  cacheKey?: string;
  receipt?: VerificationReceipt;
  receiptHash?: string;
  verificationSig?: VerificationSig;
  transport?: ProofBundleTransport;
  authorSig?: AuthorSig | null;
  mode?: "origin" | "receive";
  originBundleHash?: string;
  receiveBundleHash?: string;
  originAuthorSig?: AuthorSig | null;
  receiveSig?: ReceiveSig | null;
  receivePulse?: number;
  ownerPhiKey?: string;
  ownerKeyDerivation?: OwnerKeyDerivation;
  zkPoseidonHash?: string;
  zkProof?: unknown;
  proofHints?: unknown;
  zkPublicInputs?: unknown;
  raw?: unknown;
};

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: true,
  trimValues: true,
  cdataPropName: "__cdata",
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function safeJsonParse(s: string): unknown | null {
  const t = s.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function parseOwnerKeyDerivation(raw: unknown): OwnerKeyDerivation | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  if (record.v !== "OPK-1" || record.method !== "phiKey@pulse") return undefined;
  const receivePulse = typeof record.receivePulse === "number" && Number.isFinite(record.receivePulse) ? record.receivePulse : null;
  if (receivePulse == null) return undefined;
  const binds = record.binds;
  if (!binds || typeof binds !== "object") return undefined;
  const bindsRec = binds as Record<string, unknown>;
  if (typeof bindsRec.receiveBundleHash !== "string") return undefined;
  const originPhiKey = typeof record.originPhiKey === "string" ? record.originPhiKey : undefined;
  return {
    v: "OPK-1",
    method: "phiKey@pulse",
    originPhiKey,
    receivePulse,
    binds: { receiveBundleHash: bindsRec.receiveBundleHash },
  };
}

function tryDecodeEmbeddedPayload(raw: Record<string, unknown>): Record<string, unknown> | null {
  const payload = raw.payload;
  if (typeof payload !== "string" || payload.trim().length === 0) return null;
  try {
    const bytes = gunzipB64(payload);
    const text = new TextDecoder().decode(bytes);
    const parsed = safeJsonParse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toEmbeddedMetaFromUnknown(raw: unknown): EmbeddedMeta {
  if (!isRecord(raw)) return { raw };

  const capsuleRaw = isRecord(raw.proofCapsule) ? raw.proofCapsule : undefined;
  const decodedPayload = tryDecodeEmbeddedPayload(raw);
  const transportRaw = isRecord(raw.transport) ? raw.transport : undefined;

  const kaiSignature =
    typeof raw.kaiSignature === "string"
      ? raw.kaiSignature
      : typeof capsuleRaw?.kaiSignature === "string"
        ? capsuleRaw.kaiSignature
        : undefined;

  const pulse =
    typeof raw.pulse === "number" && Number.isFinite(raw.pulse)
      ? raw.pulse
      : typeof capsuleRaw?.pulse === "number" && Number.isFinite(capsuleRaw.pulse)
        ? capsuleRaw.pulse
        : undefined;
  const pulseExact = typeof raw.pulseExact === "string" ? raw.pulseExact : undefined;

  const beat =
    typeof raw.beat === "number" && Number.isFinite(raw.beat) ? raw.beat : undefined;

  const stepIndex =
    typeof raw.stepIndex === "number" && Number.isFinite(raw.stepIndex) ? raw.stepIndex : undefined;

  const frequencyHz =
    typeof raw.frequencyHz === "number" && Number.isFinite(raw.frequencyHz)
      ? raw.frequencyHz
      : undefined;

  const chakraDay =
    typeof raw.chakraDay === "string"
      ? raw.chakraDay
      : typeof capsuleRaw?.chakraDay === "string"
        ? capsuleRaw.chakraDay
        : undefined;

  const chakraGate =
    typeof raw.chakraGate === "string" ? raw.chakraGate : undefined;

  const timestamp =
    typeof raw.timestamp === "string" ? raw.timestamp : undefined;

  const shareUrl =
    typeof raw.shareUrl === "string"
      ? raw.shareUrl
      : typeof transportRaw?.shareUrl === "string"
        ? transportRaw.shareUrl
        : isRecord(raw.header) && typeof raw.header.shareUrl === "string"
          ? raw.header.shareUrl
          : undefined;

  const phiKeyRaw = typeof raw.phiKey === "string" ? raw.phiKey : undefined;
  const userPhiKey = typeof raw.userPhiKey === "string" ? raw.userPhiKey : undefined;
  const capsulePhiKey = typeof capsuleRaw?.phiKey === "string" ? capsuleRaw.phiKey : undefined;

  const phiKey =
    phiKeyRaw && !phiKeyRaw.startsWith("φK-")
      ? phiKeyRaw
      : capsulePhiKey ??
        userPhiKey;

  const verifierUrl =
    typeof raw.verifierUrl === "string"
      ? raw.verifierUrl
      : typeof transportRaw?.verifierUrl === "string"
        ? transportRaw.verifierUrl
        : undefined;

  const verifier =
    typeof raw.verifier === "string" && (raw.verifier === "local" || raw.verifier === "pbi")
      ? (raw.verifier as VerificationSource)
      : typeof transportRaw?.verifier === "string" && (transportRaw.verifier === "local" || transportRaw.verifier === "pbi")
        ? (transportRaw.verifier as VerificationSource)
        : undefined;

  const verificationVersion =
    typeof raw.verificationVersion === "string" ? raw.verificationVersion : undefined;

  const verifiedAtPulseRaw =
    raw.verifiedAtPulse ??
    transportRaw?.verifiedAtPulse ??
    decodedPayload?.verifiedAtPulse ??
    undefined;
  const verifiedAtPulse =
    typeof verifiedAtPulseRaw === "number" && Number.isFinite(verifiedAtPulseRaw)
      ? verifiedAtPulseRaw
      : typeof verifiedAtPulseRaw === "string" && Number.isFinite(Number(verifiedAtPulseRaw))
        ? Number(verifiedAtPulseRaw)
        : undefined;

  const proofCapsule =
    capsuleRaw &&
    typeof capsuleRaw.v === "string" &&
    typeof capsuleRaw.kaiSignature === "string" &&
    typeof capsuleRaw.phiKey === "string" &&
    typeof capsuleRaw.verifierSlug === "string" &&
    typeof capsuleRaw.pulse === "number" &&
    typeof capsuleRaw.chakraDay === "string"
      ? (capsuleRaw as ProofCapsuleV1)
      : undefined;

  const zkPoseidonHash =
    typeof raw.zkPoseidonHash === "string"
      ? raw.zkPoseidonHash
      : typeof decodedPayload?.zkPoseidonHash === "string"
        ? decodedPayload.zkPoseidonHash
        : undefined;
  const zkProof =
    "zkProof" in raw
      ? raw.zkProof
      : decodedPayload && "zkProof" in decodedPayload
        ? decodedPayload.zkProof
        : undefined;
  const proofHints =
    "proofHints" in raw
      ? raw.proofHints
      : transportRaw && "proofHints" in transportRaw
        ? transportRaw.proofHints
        : decodedPayload && "proofHints" in decodedPayload
          ? decodedPayload.proofHints
          : undefined;
  const zkPublicInputs =
    "zkPublicInputs" in raw
      ? raw.zkPublicInputs
      : decodedPayload && "zkPublicInputs" in decodedPayload
        ? decodedPayload.zkPublicInputs
        : undefined;

  const capsuleHash = typeof raw.capsuleHash === "string" ? raw.capsuleHash : undefined;
  const svgHash = typeof raw.svgHash === "string" ? raw.svgHash : undefined;
  const bundleHash = typeof raw.bundleHash === "string" ? raw.bundleHash : undefined;
  const mode = raw.mode === "receive" || raw.mode === "origin" ? raw.mode : undefined;
  const originBundleHash = typeof raw.originBundleHash === "string" ? raw.originBundleHash : undefined;
  const receiveBundleHash = typeof raw.receiveBundleHash === "string" ? raw.receiveBundleHash : undefined;
  const hashAlg = typeof raw.hashAlg === "string" ? raw.hashAlg : undefined;
  const canon = typeof raw.canon === "string" ? raw.canon : undefined;
  const bindings = isRecord(raw.bindings) ? (raw.bindings as ProofBundleBindings) : undefined;
  const zkStatement = isRecord(raw.zkStatement) ? (raw.zkStatement as ZkStatement) : undefined;
  const bundleRoot = isRecord(raw.bundleRoot) ? (raw.bundleRoot as BundleRoot) : undefined;
  const zkMeta = isRecord(raw.zkMeta) ? (raw.zkMeta as ZkMeta) : undefined;
  const verificationCache = isRecord(raw.verificationCache)
    ? (raw.verificationCache as VerificationCache)
    : undefined;
  const cacheKey =
    typeof raw.cacheKey === "string"
      ? raw.cacheKey
      : typeof decodedPayload?.cacheKey === "string"
        ? decodedPayload.cacheKey
        : undefined;
  const receipt =
    isRecord(raw.receipt)
      ? (raw.receipt as VerificationReceipt)
      : decodedPayload && isRecord(decodedPayload.receipt)
        ? (decodedPayload.receipt as VerificationReceipt)
        : undefined;
  const receiptHash =
    typeof raw.receiptHash === "string"
      ? raw.receiptHash
      : typeof decodedPayload?.receiptHash === "string"
        ? decodedPayload.receiptHash
        : undefined;
  const verificationSig =
    isRecord(raw.verificationSig)
      ? (raw.verificationSig as VerificationSig)
      : decodedPayload && isRecord(decodedPayload.verificationSig)
        ? (decodedPayload.verificationSig as VerificationSig)
        : undefined;
  const transport = isRecord(raw.transport) ? (raw.transport as ProofBundleTransport) : undefined;
  const authorSig = parseAuthorSig(raw.authorSig);
  const originAuthorSig = parseAuthorSig(raw.originAuthorSig);
  const receiveSig = isReceiveSig(raw.receiveSig) ? raw.receiveSig : undefined;
  const receivePulseRaw = raw.receivePulse;
  const receivePulse =
    typeof receivePulseRaw === "number" && Number.isFinite(receivePulseRaw)
      ? receivePulseRaw
      : typeof receivePulseRaw === "string" && Number.isFinite(Number(receivePulseRaw))
        ? Number(receivePulseRaw)
        : undefined;
  const ownerPhiKey = typeof raw.ownerPhiKey === "string" ? raw.ownerPhiKey : undefined;
  const ownerKeyDerivation = parseOwnerKeyDerivation(raw.ownerKeyDerivation);

  return {
    pulse,
    pulseExact,
    beat,
    stepIndex,
    frequencyHz,
    chakraDay,
    chakraGate,
    kaiSignature,
    phiKey,
    timestamp,
    shareUrl,
    verifierUrl,
    verifier,
    verificationVersion,
    verifiedAtPulse,
    proofCapsule,
    capsuleHash,
    svgHash,
    bundleHash,
    mode,
    originBundleHash,
    receiveBundleHash,
    hashAlg,
    canon,
    bindings,
    zkStatement,
    bundleRoot,
    zkMeta,
    verificationCache,
    cacheKey,
    receipt,
    receiptHash,
    verificationSig,
    transport,
    authorSig,
    originAuthorSig,
    receiveSig,
    receivePulse,
    ownerPhiKey,
    ownerKeyDerivation,
    zkPoseidonHash,
    zkProof,
    proofHints,
    zkPublicInputs,
    raw,
  };
}

function collectText(node: unknown, texts: string[]): void {
  if (typeof node === "string") {
    texts.push(node);
    return;
  }
  if (!isRecord(node)) return;

  if (typeof node.__cdata === "string") {
    texts.push(node.__cdata);
  }

  for (const value of Object.values(node)) {
    collectText(value, texts);
  }
}

function extractNearbyJsonBlocks(text: string, matchIndex: number, window = 2000): string[] {
  const start = Math.max(0, matchIndex - window);
  const end = Math.min(text.length, matchIndex + window);
  const slice = text.slice(start, end);
  const targetIndex = matchIndex - start;

  const blocks: Array<{ start: number; end: number }> = [];
  const stack: number[] = [];
  let inString = false;
  let escaping = false;

  for (let i = 0; i < slice.length; i += 1) {
    const ch = slice[i];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (ch === "\\") {
        escaping = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      stack.push(i);
      continue;
    }

    if (ch === "}") {
      const blockStart = stack.pop();
      if (blockStart == null) continue;
      if (blockStart <= targetIndex && i >= targetIndex) {
        blocks.push({ start: blockStart, end: i });
      }
    }
  }

  blocks.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  return blocks.map(({ start: s, end: e }) => slice.slice(s, e + 1));
}

function findJsonInText(text: string): EmbeddedMeta | null {
  const parsed = safeJsonParse(text);
  if (parsed) {
    const parsedMeta = toEmbeddedMetaFromUnknown(parsed);
    if (parsedMeta.kaiSignature) return parsedMeta;
  }

  const matches = [...text.matchAll(/"kaiSignature"\s*:/g)];
  if (!matches.length) return null;

  for (const match of matches) {
    const idx = match.index ?? 0;
    const blocks = extractNearbyJsonBlocks(text, idx);
    for (const block of blocks) {
      if (!block.includes('"kaiSignature"')) continue;
      const blobParsed = safeJsonParse(block);
      if (!blobParsed) continue;
      const meta = toEmbeddedMetaFromUnknown(blobParsed);
      if (meta.kaiSignature) return meta;
    }
  }

  return null;
}

function isProofBundleMeta(meta: EmbeddedMeta): boolean {
  return Boolean(meta.bundleHash || (meta.capsuleHash && meta.svgHash));
}

function findProofBundleInText(text: string): ProofBundleMeta | null {
  const parsed = safeJsonParse(text);
  if (parsed) {
    const meta = toEmbeddedMetaFromUnknown(parsed);
    if (isProofBundleMeta(meta)) {
      return {
        hashAlg: meta.hashAlg,
        canon: meta.canon,
        proofCapsule: meta.proofCapsule,
        capsuleHash: meta.capsuleHash,
        svgHash: meta.svgHash,
        bundleHash: meta.bundleHash,
        mode: meta.mode,
        originBundleHash: meta.originBundleHash,
        receiveBundleHash: meta.receiveBundleHash,
        verifierUrl: meta.verifierUrl,
        authorSig: meta.authorSig,
        originAuthorSig: meta.originAuthorSig,
        receiveSig: meta.receiveSig,
        receivePulse: meta.receivePulse,
        ownerPhiKey: meta.ownerPhiKey,
        ownerKeyDerivation: meta.ownerKeyDerivation,
        zkPoseidonHash: meta.zkPoseidonHash,
        zkProof: meta.zkProof,
        proofHints: meta.proofHints,
        zkPublicInputs: meta.zkPublicInputs,
        bindings: meta.bindings,
        zkStatement: meta.zkStatement,
        bundleRoot: meta.bundleRoot,
        zkMeta: meta.zkMeta,
        verificationCache: meta.verificationCache,
        cacheKey: meta.cacheKey,
        receipt: meta.receipt,
        receiptHash: meta.receiptHash,
        verificationSig: meta.verificationSig,
        transport: meta.transport,
        raw: parsed,
      };
    }
  }

  const matches = [...text.matchAll(/"(bundleHash|capsuleHash|svgHash)"\s*:/g)];
  if (!matches.length) return null;

  for (const match of matches) {
    const idx = match.index ?? 0;
    const blocks = extractNearbyJsonBlocks(text, idx);
    for (const block of blocks) {
      if (!/(bundleHash|capsuleHash|svgHash)/.test(block)) continue;
      const blobParsed = safeJsonParse(block);
      if (!blobParsed) continue;
      const meta = toEmbeddedMetaFromUnknown(blobParsed);
      if (!isProofBundleMeta(meta)) continue;
      return {
        hashAlg: meta.hashAlg,
        canon: meta.canon,
        proofCapsule: meta.proofCapsule,
        capsuleHash: meta.capsuleHash,
        svgHash: meta.svgHash,
        bundleHash: meta.bundleHash,
        mode: meta.mode,
        originBundleHash: meta.originBundleHash,
        receiveBundleHash: meta.receiveBundleHash,
        verifierUrl: meta.verifierUrl,
        authorSig: meta.authorSig,
        originAuthorSig: meta.originAuthorSig,
        receiveSig: meta.receiveSig,
        receivePulse: meta.receivePulse,
        ownerPhiKey: meta.ownerPhiKey,
        ownerKeyDerivation: meta.ownerKeyDerivation,
        zkPoseidonHash: meta.zkPoseidonHash,
        zkProof: meta.zkProof,
        proofHints: meta.proofHints,
        zkPublicInputs: meta.zkPublicInputs,
        bindings: meta.bindings,
        zkStatement: meta.zkStatement,
        bundleRoot: meta.bundleRoot,
        zkMeta: meta.zkMeta,
        verificationCache: meta.verificationCache,
        cacheKey: meta.cacheKey,
        receipt: meta.receipt,
        receiptHash: meta.receiptHash,
        verificationSig: meta.verificationSig,
        transport: meta.transport,
        raw: blobParsed,
      };
    }
  }

  return null;
}

function extractFromParsedSvg(parsed: Record<string, unknown>): EmbeddedMeta | null {
  const svg = isRecord(parsed.svg) ? parsed.svg : parsed;
  const candidates: string[] = [];

  if (isRecord(svg.metadata)) {
    collectText(svg.metadata, candidates);
  } else if (typeof svg.metadata === "string") {
    candidates.push(svg.metadata);
  }

  if (isRecord(svg.desc)) {
    collectText(svg.desc, candidates);
  } else if (typeof svg.desc === "string") {
    candidates.push(svg.desc);
  }

  for (const text of candidates) {
    const meta = findJsonInText(text);
    if (meta) return meta;
  }

  return null;
}

function getAttr(svg: string, key: string): string | undefined {
  const pattern = `${key}\\s*=\\s*("([^"]*)"|'([^']*)')`;
  const match = svg.match(new RegExp(pattern, "i"));
  if (!match) return undefined;
  return match[2] ?? match[3];
}

function getNumberAttr(svg: string, key: string): number | undefined {
  const raw = getAttr(svg, key);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractAttrFallback(svgText: string): EmbeddedMeta {
  const pulse = getNumberAttr(svgText, "data-pulse");
  const beat = getNumberAttr(svgText, "data-beat");
  const stepIndex = getNumberAttr(svgText, "data-step-index");
  const frequencyHz = getNumberAttr(svgText, "data-frequency-hz");
  const chakraGate = getAttr(svgText, "data-chakra-gate");
  const chakraDay = getAttr(svgText, "data-harmonic-day") ?? getAttr(svgText, "data-chakra-day");
  const kaiSignature = getAttr(svgText, "data-kai-signature");
  const phiKey = getAttr(svgText, "data-phi-key");
  const shareUrl = getAttr(svgText, "data-share-url");
  const zkPoseidonHash = getAttr(svgText, "data-zk-poseidon-hash");
  const zkPublicInputs = getAttr(svgText, "data-zk-public-inputs");

  return {
    pulse,
    beat,
    stepIndex,
    frequencyHz,
    chakraDay,
    chakraGate,
    kaiSignature,
    phiKey,
    shareUrl,
    zkPoseidonHash,
    zkPublicInputs,
  };
}

function mergeEmbeddedMeta(primary: EmbeddedMeta, fallback: EmbeddedMeta): EmbeddedMeta {
  const merged: EmbeddedMeta = { ...primary };
  for (const [key, value] of Object.entries(fallback)) {
    if (value === undefined) continue;
    const current = (merged as Record<string, unknown>)[key];
    if (current === undefined || current === null) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

export function extractEmbeddedMetaFromSvg(svgText: string): EmbeddedMeta {
  const attrFallback = extractAttrFallback(svgText);
  try {
    const parsed = XML_PARSER.parse(svgText);
    if (isRecord(parsed)) {
      const meta = extractFromParsedSvg(parsed);
      if (meta) return mergeEmbeddedMeta(meta, attrFallback);
    }
  } catch (err) {
    console.warn("sigilMetadata: failed to parse SVG", err);
  }

  const fallback = findJsonInText(svgText);
  if (fallback) return mergeEmbeddedMeta(fallback, attrFallback);
  return attrFallback;
}

export type ProofBundleMeta = {
  hashAlg?: string;
  canon?: string;
  bindings?: ProofBundleBindings;
  zkStatement?: ZkStatement;
  bundleRoot?: BundleRoot;
  zkMeta?: ZkMeta;
  verificationCache?: VerificationCache;
  cacheKey?: string;
  receipt?: VerificationReceipt;
  receiptHash?: string;
  verificationSig?: VerificationSig;
  transport?: ProofBundleTransport;
  proofCapsule?: ProofCapsuleV1;
  capsuleHash?: string;
  svgHash?: string;
  bundleHash?: string;
  shareUrl?: string;
  verifierUrl?: string;
  verifier?: VerificationSource;
  verificationVersion?: string;
  verifiedAtPulse?: number;
  authorSig?: AuthorSig | null;
  mode?: "origin" | "receive";
  originBundleHash?: string;
  receiveBundleHash?: string;
  originAuthorSig?: AuthorSig | null;
  receiveSig?: ReceiveSig | null;
  receivePulse?: number;
  ownerPhiKey?: string;
  ownerKeyDerivation?: OwnerKeyDerivation;
  zkPoseidonHash?: string;
  zkProof?: unknown;
  proofHints?: unknown;
  zkPublicInputs?: unknown;
  raw?: unknown;
};

export function extractProofBundleMetaFromSvg(svgText: string): ProofBundleMeta | null {
  const vohMatch = svgText.match(
    /<metadata[^>]*id=["']kai-voh-proof["'][^>]*>([\s\S]*?)<\/metadata>/i
  );
  if (vohMatch) {
    const rawBlock = vohMatch[1]?.trim() ?? "";
    if (rawBlock) {
      const cleaned = rawBlock.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
      const parsed = safeJsonParse(cleaned);
      if (parsed) {
        const meta = toEmbeddedMetaFromUnknown(parsed);
        return {
          hashAlg: meta.hashAlg,
          canon: meta.canon,
          bindings: meta.bindings,
          zkStatement: meta.zkStatement,
          bundleRoot: meta.bundleRoot,
          zkMeta: meta.zkMeta,
          verificationCache: meta.verificationCache,
          cacheKey: meta.cacheKey,
          receipt: meta.receipt,
          receiptHash: meta.receiptHash,
          verificationSig: meta.verificationSig,
          transport: meta.transport,
          proofCapsule: meta.proofCapsule,
          capsuleHash: meta.capsuleHash,
          svgHash: meta.svgHash,
          bundleHash: meta.bundleHash,
          shareUrl: meta.shareUrl,
          verifierUrl: meta.verifierUrl,
          verifier: meta.verifier,
          verificationVersion: meta.verificationVersion,
          verifiedAtPulse: meta.verifiedAtPulse,
          authorSig: meta.authorSig,
          mode: meta.mode,
          originBundleHash: meta.originBundleHash,
          receiveBundleHash: meta.receiveBundleHash,
          originAuthorSig: meta.originAuthorSig,
          receiveSig: meta.receiveSig,
          receivePulse: meta.receivePulse,
          ownerPhiKey: meta.ownerPhiKey,
          ownerKeyDerivation: meta.ownerKeyDerivation,
          zkPoseidonHash: meta.zkPoseidonHash,
          zkProof: meta.zkProof,
          proofHints: meta.proofHints,
          zkPublicInputs: meta.zkPublicInputs,
          raw: parsed,
        };
      }
    }
  }

  const match = svgText.match(
    /<metadata[^>]*id=["'](?:kai-proof|kai-voh-proof)["'][^>]*>([\s\S]*?)<\/metadata>/i
  );
  if (match) {
    const rawBlock = match[1]?.trim() ?? "";
    if (rawBlock) {
      const cleaned = rawBlock.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
      const parsed = safeJsonParse(cleaned);
      if (parsed) {
        const meta = toEmbeddedMetaFromUnknown(parsed);
        return {
          hashAlg: meta.hashAlg,
          canon: meta.canon,
          bindings: meta.bindings,
          zkStatement: meta.zkStatement,
          bundleRoot: meta.bundleRoot,
          zkMeta: meta.zkMeta,
          verificationCache: meta.verificationCache,
          cacheKey: meta.cacheKey,
          receipt: meta.receipt,
          receiptHash: meta.receiptHash,
          verificationSig: meta.verificationSig,
          transport: meta.transport,
          proofCapsule: meta.proofCapsule,
          capsuleHash: meta.capsuleHash,
          svgHash: meta.svgHash,
          bundleHash: meta.bundleHash,
          shareUrl: meta.shareUrl,
          verifierUrl: meta.verifierUrl,
          verifier: meta.verifier,
          verificationVersion: meta.verificationVersion,
          verifiedAtPulse: meta.verifiedAtPulse,
          authorSig: meta.authorSig,
          mode: meta.mode,
          originBundleHash: meta.originBundleHash,
          receiveBundleHash: meta.receiveBundleHash,
          originAuthorSig: meta.originAuthorSig,
          receiveSig: meta.receiveSig,
          receivePulse: meta.receivePulse,
          ownerPhiKey: meta.ownerPhiKey,
          ownerKeyDerivation: meta.ownerKeyDerivation,
          zkPoseidonHash: meta.zkPoseidonHash,
          zkProof: meta.zkProof,
          proofHints: meta.proofHints,
          zkPublicInputs: meta.zkPublicInputs,
          raw: parsed,
        };
      }
    }
  }

  try {
    const parsedSvg = XML_PARSER.parse(svgText);
    if (isRecord(parsedSvg)) {
      const svg = isRecord(parsedSvg.svg) ? parsedSvg.svg : parsedSvg;
      const candidates: string[] = [];

      if (isRecord(svg.metadata)) {
        collectText(svg.metadata, candidates);
      } else if (typeof svg.metadata === "string") {
        candidates.push(svg.metadata);
      }

      if (isRecord(svg.desc)) {
        collectText(svg.desc, candidates);
      } else if (typeof svg.desc === "string") {
        candidates.push(svg.desc);
      }

      for (const text of candidates) {
        const found = findProofBundleInText(text);
        if (found) return found;
      }
    }
  } catch (err) {
    console.warn("sigilMetadata: failed to parse SVG proof bundle", err);
  }

  return findProofBundleInText(svgText);
}

// Preserve the Wallet valuation selector's exact non-array record boundary.
function isValuationSourceRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function findValueInTree<T>(
  root: unknown,
  keys: readonly string[],
  guard: (value: unknown) => value is T,
  maxNodes = 2_500,
): T | null {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const queue: unknown[] = [root];
  const seen = new Set<unknown>();
  let visited = 0;

  while (queue.length > 0 && visited < maxNodes) {
    const node = queue.shift();
    if (!node || seen.has(node)) continue;
    seen.add(node);
    visited += 1;

    if (isValuationSourceRecord(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (wanted.has(key.toLowerCase()) && guard(value)) {
          return value;
        }
        if (isValuationSourceRecord(value) || Array.isArray(value)) queue.push(value);
      }
      continue;
    }

    if (Array.isArray(node)) {
      for (const entry of node) {
        if (isValuationSourceRecord(entry) || Array.isArray(entry)) queue.push(entry);
      }
    }
  }

  return null;
}

export function extractValuationSourceRaw(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!raw) return null;
  if (isValuationSourceRecord(raw.valuationSource)) return raw.valuationSource;
  const nested = findValueInTree(raw, ["valuationSource", "valuation_source"], isValuationSourceRecord);
  return nested ?? null;
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function asPositiveInt(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed === null || parsed < 0) return null;
  return Math.trunc(parsed);
}

export function asTrimmedString(value: unknown, max = 512): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean) return null;
  return clean.slice(0, max);
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return null;
}

function parseTransfers(value: unknown): SigilTransfer[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const out: SigilTransfer[] = [];
  for (const entry of value.slice(0, 2_048)) {
    if (!isValuationSourceRecord(entry)) continue;

    const senderSignature = asTrimmedString(entry.senderSignature, 400);
    const senderStamp = asTrimmedString(entry.senderStamp, 256);
    const senderKaiPulse = asPositiveInt(entry.senderKaiPulse);
    if (!senderSignature || !senderStamp || senderKaiPulse === null) continue;

    const transfer: SigilTransfer = {
      senderSignature,
      senderStamp,
      senderKaiPulse,
    };

    const payloadRaw = entry.payload;
    if (isValuationSourceRecord(payloadRaw)) {
      const payloadName = asTrimmedString(payloadRaw.name, 180);
      const payloadMime = asTrimmedString(payloadRaw.mime, 120);
      const payloadSize = asPositiveInt(payloadRaw.size);
      if (payloadName && payloadMime && payloadSize !== null) {
        transfer.payload = {
          name: payloadName,
          mime: payloadMime,
          size: payloadSize,
        };
      }
    }

    const receiverSignature = asTrimmedString(entry.receiverSignature, 400);
    const receiverStamp = asTrimmedString(entry.receiverStamp, 256);
    const receiverKaiPulse = asPositiveInt(entry.receiverKaiPulse);
    if (receiverSignature) transfer.receiverSignature = receiverSignature;
    if (receiverStamp) transfer.receiverStamp = receiverStamp;
    if (receiverKaiPulse !== null) transfer.receiverKaiPulse = receiverKaiPulse;

    out.push(transfer);
  }

  return out.length > 0 ? out : undefined;
}

function parseCashflowPhi(value: unknown): { atPulse: number; amountPhi: number }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: { atPulse: number; amountPhi: number }[] = [];
  for (const entry of value.slice(0, 2_048)) {
    if (!isValuationSourceRecord(entry)) continue;
    const atPulse = asPositiveInt(entry.atPulse);
    const amountPhi = asFiniteNumber(entry.amountPhi);
    if (atPulse === null || amountPhi === null || amountPhi < 0) continue;
    out.push({ atPulse, amountPhi });
  }
  return out.length > 0 ? out : undefined;
}

function parseCashflowKs(value: unknown): { atPulse: number; amountKS: number }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: { atPulse: number; amountKS: number }[] = [];
  for (const entry of value.slice(0, 2_048)) {
    if (!isValuationSourceRecord(entry)) continue;
    const atPulse = asPositiveInt(entry.atPulse);
    const amountKS = asFiniteNumber(entry.amountKS);
    if (atPulse === null || amountKS === null || amountKS < 0) continue;
    out.push({ atPulse, amountKS });
  }
  return out.length > 0 ? out : undefined;
}

function extractIp(value: unknown): SigilMetadataLite["ip"] | undefined {
  if (!isValuationSourceRecord(value)) return undefined;
  const expectedCashflowPhi = parseCashflowPhi(value.expectedCashflowPhi);
  const expectedCashflowKS = parseCashflowKs(value.expectedCashflowKS);
  if (!expectedCashflowPhi && !expectedCashflowKS) return undefined;
  return {
    expectedCashflowPhi,
    expectedCashflowKS,
  };
}

function normalizeQuality(value: unknown): SigilMetadataLite["quality"] | undefined {
  if (typeof value !== "string") return undefined;
  const quality = value.trim().toLowerCase();
  if (quality === "low") return "low";
  if (quality === "med" || quality === "medium") return "med";
  if (quality === "high") return "high";
  return undefined;
}

export function normalizeValuationSource(args: {
  valuationSourceRaw: Record<string, unknown> | null;
  embedded: EmbeddedMeta;
  raw: Record<string, unknown> | null;
  kaiSignature: string;
  derivedPhiKey: string;
}): SigilMetadataLite {
  const source = args.valuationSourceRaw ?? args.raw ?? {};

  const pulse = asPositiveInt(source.pulse)
    ?? asPositiveInt(source.kaiPulse)
    ?? (typeof args.embedded.pulse === "number" && Number.isFinite(args.embedded.pulse)
      ? Math.trunc(args.embedded.pulse)
      : null)
    ?? 0;

  const kaiPulse = asPositiveInt(source.kaiPulse)
    ?? asPositiveInt(source.pulse)
    ?? pulse;

  const beat = asPositiveInt(source.beat)
    ?? (typeof args.embedded.beat === "number" && Number.isFinite(args.embedded.beat)
      ? Math.trunc(args.embedded.beat)
      : undefined);

  const stepIndex = asPositiveInt(source.stepIndex)
    ?? asPositiveInt(source.step_index)
    ?? (typeof args.embedded.stepIndex === "number" && Number.isFinite(args.embedded.stepIndex)
      ? Math.trunc(args.embedded.stepIndex)
      : undefined);

  const stepsPerBeat = asPositiveInt(source.stepsPerBeat)
    ?? asPositiveInt(source.steps_per_beat)
    ?? asPositiveInt(source.steps)
    ?? undefined;

  const frequencyHz = asFiniteNumber(source.frequencyHz)
    ?? asFiniteNumber(source.frequency_hz)
    ?? (typeof args.embedded.frequencyHz === "number" && Number.isFinite(args.embedded.frequencyHz)
      ? args.embedded.frequencyHz
      : undefined);

  const chakraDay = asTrimmedString(source.chakraDay, 64)
    ?? asTrimmedString(source.chakra_day, 64)
    ?? (typeof args.embedded.chakraDay === "string" ? args.embedded.chakraDay : undefined)
    ?? undefined;

  const chakraGate = asTrimmedString(source.chakraGate, 64)
    ?? asTrimmedString(source.chakra_gate, 64)
    ?? (typeof args.embedded.chakraGate === "string" ? args.embedded.chakraGate : undefined)
    ?? undefined;

  const userPhiKey = asTrimmedString(source.userPhiKey, 240)
    ?? asTrimmedString(source.phiKey, 240)
    ?? asTrimmedString(source.phikey, 240)
    ?? (typeof args.embedded.phiKey === "string" ? args.embedded.phiKey.trim() : null)
    ?? args.derivedPhiKey;

  const out: SigilMetadataLite = {
    pulse,
    kaiPulse,
    kaiSignature: args.kaiSignature,
    userPhiKey,
    beat,
    stepIndex,
    stepsPerBeat,
    quality: normalizeQuality(source.quality),
    creatorVerified: asBoolean(source.creatorVerified) ?? undefined,
    creatorRep: asFiniteNumber(source.creatorRep) ?? undefined,
    seriesSize: asPositiveInt(source.seriesSize) ?? undefined,
    frequencyHz: frequencyHz ?? undefined,
    chakraDay,
    chakraGate,
    valuationPolicyId: asTrimmedString(source.valuationPolicyId, 120) ?? undefined,
  };

  const transfers = parseTransfers(source.transfers);
  if (transfers) out.transfers = transfers;

  const cumulativeTransfers = asPositiveInt(source.cumulativeTransfers);
  if (cumulativeTransfers !== null) out.cumulativeTransfers = cumulativeTransfers;

  const ip = extractIp(source.ip);
  if (ip) out.ip = ip;

  return out;
}
