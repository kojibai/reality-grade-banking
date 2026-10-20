import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { inspectReceizZipBytes } from "@/app/lib/receizArtifactVerifier";
import type { ReceizGuardedZipEntry } from "../../../../packages/receiz-sdk/src/verifier/canonical";
import { parseReceizKeyFileText, readReceizIdentityRecordKeyTrailer, RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY } from "@/app/utils/receizIdentityKey";
import { readPngTextChunks } from "@/app/utils/pngChunks";
import { decodeReceizBundleEnvelope } from "@/app/lib/documentSeal/bundleContainer";
import { extractReceizPortableAssetPayload } from "../../../../packages/receiz-sdk/src/portableAsset";
import { detectReceizRecursiveArchiveFormat, RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS } from "../../../../packages/receiz-sdk/src/verificationLimits";
import { ImportedProofSourceUnavailableError } from "./importedSourceErrors";
import { isBase64DataUrl } from "@/app/utils/dataUrl";
import { parseReceizTrailer } from "@/app/lib/documentSeal/trailerProof";

function privateSource(): never { throw new TypeError("IMPORTED_SOURCE_PRIVATE_RECOVERY_MATERIAL"); }
const decoder = new TextDecoder();
const pngMagic = [137, 80, 78, 71, 13, 10, 26, 10];
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Native media stays Blob-backed. Text/PNG payloads still use their existing
 * parsers rather than treating a media extension as permission to skip them. */
export async function rejectImportedSourceRecoveryBlob(payload: Blob): Promise<void> {
  let inspectStructured = false;
  let sawContent = false;
  let carry = "";
  for (let offset = 0; offset < payload.size; offset += 1024 * 1024) {
    const end = Math.min(payload.size, offset + 1024 * 1024);
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await payload.slice(offset, end).arrayBuffer());
      if (bytes.byteLength !== end - offset) throw new Error("short selected-source privacy read");
    } catch {
      throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_PRIVACY_IO_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
    }
    if (offset === 0 && detectReceizRecursiveArchiveFormat(bytes)) {
      if (payload.size > RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS.exactArtifactBytes) {
        throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_ARCHIVE_INSPECTION_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
      }
      await rejectImportedSourceRecoveryBytes(new Uint8Array(await payload.arrayBuffer()));
      return;
    }
    const text = decoder.decode(bytes);
    if (!sawContent && text.trimStart()) {
      inspectStructured = /^[\[{]/.test(text.trimStart()) || pngMagic.every((byte, index) => bytes[index] === byte);
      sawContent = true;
      if (inspectStructured && payload.size > RECEIZ_V113_RUNTIME_MATERIALIZATION_LIMITS.exactArtifactBytes) {
        throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_STRUCTURED_PRIVACY_INSPECTION_UNAVAILABLE", "VERIFICATION_RESOURCE_UNAVAILABLE", "not-evaluated");
      }
    }
    const scan = carry + text;
    if (scan.includes("\n--RECEIZ-IDENTITY-RECORD-KEYFILE-V1--\n")) privateSource();
    carry = scan.slice(-80);
  }
  if (inspectStructured) await rejectImportedSourceRecoveryBytes(new Uint8Array(await payload.arrayBuffer()));
}
/** Selection-scoped inspection only. Never reads device identity, storage,
 * session, recovery files or remote attachments. Parsing is privacy detection,
 * not proof admission. Malformed recognized recovery carriers fail closed. */
export function createImportedSourcePrivacyInspection(preExtracted?: Readonly<{ bytes: Uint8Array; entries: readonly ReceizGuardedZipEntry[] }>) {
  // Selection-local extraction reuse. Neither caller descriptors nor process
  // global storage can supply this inspection's bytes or proof authority.
  const archives = new Map<string, readonly ReceizGuardedZipEntry[]>();
  if (preExtracted) archives.set(bytesToHex(sha256(preExtracted.bytes)), preExtracted.entries);
  return async function inspect(selectedBytes: Uint8Array): Promise<void> {
    const pendingBytes = [{ bytes: selectedBytes, archiveDepth: 0 }];
    const pendingValues: { value: unknown; archiveDepth: number }[] = [];
    while (pendingBytes.length || pendingValues.length) {
      const next = pendingBytes.pop();
      if (next) {
        const { bytes, archiveDepth } = next;
        const archive = detectReceizRecursiveArchiveFormat(bytes);
        if (archive) {
          if (archiveDepth > 0 || archive !== "zip") {
            const code = archiveDepth > 0 ? "ARCHIVE_RECURSION_FORBIDDEN" : "ARCHIVE_PRIVACY_INSPECTION_UNAVAILABLE";
            throw new ImportedProofSourceUnavailableError(`IMPORTED_SOURCE_PRIVACY_INSPECTION_UNAVAILABLE:${archive}:${code}`, code, "not-evaluated");
          }
          const trailer = parseReceizTrailer(bytes);
          if (trailer.bundle !== null && trailer.parseError === null) {
            pendingValues.push({ value: trailer.bundle, archiveDepth });
            pendingBytes.push({ bytes: trailer.basisBytes, archiveDepth });
          } else {
            const digest = bytesToHex(sha256(bytes));
            let entries = archives.get(digest);
            if (!entries) {
              const inspected = await inspectReceizZipBytes({ fileBytes: bytes });
              if (!inspected.inspected) throw new ImportedProofSourceUnavailableError(`IMPORTED_SOURCE_PRIVACY_INSPECTION_UNAVAILABLE:${archive}:${inspected.error}`, inspected.error, "not-evaluated");
              entries = inspected.entries;
              archives.set(digest, entries);
            }
            for (const entry of entries) pendingBytes.push({ bytes: entry.bytes, archiveDepth: archiveDepth + 1 });
          }
          // Continue inspecting selected trailer/unknown JSON-bearing fields below.
        }
        const isPng = pngMagic.every((byte, index) => bytes[index] === byte);
        if (isPng) {
          if (readReceizIdentityRecordKeyTrailer(bytes) !== null) privateSource();
          // A truncated private trailer or malformed key chunk is not public.
          if (decoder.decode(bytes).includes("\n--RECEIZ-IDENTITY-RECORD-KEYFILE-V1--\n")) privateSource();
          if (readPngTextChunks(bytes).some((chunk) => chunk.keyword === RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY)) privateSource();
        }
        const text = decoder.decode(bytes);
        try { parseReceizKeyFileText(text); privateSource(); } catch (error) {
          if (error instanceof TypeError && error.message === "IMPORTED_SOURCE_PRIVATE_RECOVERY_MATERIAL") throw error;
        }
        const envelope = decodeReceizBundleEnvelope(bytes);
        if (envelope) pendingBytes.push({ bytes: envelope.originalBytes, archiveDepth });
        const trailer = parseReceizTrailer(bytes);
        if (!archive && trailer.bundle !== null && trailer.parseError === null) {
          pendingValues.push({ value: trailer.bundle, archiveDepth });
          pendingBytes.push({ bytes: trailer.basisBytes, archiveDepth });
        }
        try { pendingValues.push({ value: JSON.parse(text), archiveDepth }); } catch { /* Opaque payload stays opaque. */ }
        continue;
      }
      const nextValue = pendingValues.pop();
      if (!nextValue) continue;
      const { value, archiveDepth } = nextValue;
      // Decode each value at the worklist boundary so object properties and
      // array elements receive the same selected-source privacy inspection.
      if (typeof value === "string") {
        if (isBase64DataUrl(value)) {
          const raw = value.trim();
          const decoded = atob(raw.slice(raw.indexOf(",") + 1).replace(/\s+/g, ""));
          pendingBytes.push({ bytes: Uint8Array.from(decoded, (character) => character.charCodeAt(0)), archiveDepth });
        } else if (/^[\[{]/.test(value.trimStart())) {
          try { pendingValues.push({ value: JSON.parse(value), archiveDepth }); } catch { /* Display text is not a key file. */ }
        }
        continue;
      }
      if (Array.isArray(value)) { pendingValues.push(...value.map(value => ({ value, archiveDepth }))); continue; }
      if (!record(value)) continue;
      if (value.schema === "receiz.key.v1" || Object.hasOwn(value, RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY)) privateSource();
      const crypto = value.crypto;
      if (record(crypto) && ["privateKeyPkcs8B64u", "privateKeyPkcs8CiphertextB64u"].some((key) => typeof crypto[key] === "string" && crypto[key].length > 0)) privateSource();
      if (value.schema === "receiz.portable_asset.v1") {
        const payload = await extractReceizPortableAssetPayload(value);
        pendingBytes.push({ bytes: payload.bytes, archiveDepth });
      }
      pendingValues.push(...Object.values(value).map(value => ({ value, archiveDepth })));
    }
  };
}
export async function rejectImportedSourceRecoveryBytes(selectedBytes: Uint8Array): Promise<void> {
  await createImportedSourcePrivacyInspection()(selectedBytes);
}
