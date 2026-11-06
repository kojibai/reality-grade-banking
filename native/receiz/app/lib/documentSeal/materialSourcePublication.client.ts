"use client";

import { DURABLE_LOCAL_TRUTH_RANK, readDurableLocalTruthItem, writeDurableLocalTruthItem } from "@/app/lib/runtime/localTruthStore";
import { resolveReceizMaterialPresentation } from "./playableUrlCoordinate";
import { readReceizMaterialCompositePackageDigest, verifyReceizMaterialCompositeManifest, type ReceizMaterialCompositeManifest } from "./materialCompositeTransport";
import { openHeldReceizRawMaterialCapsuleBlob } from "./materialSourceCustody.client";
import { resolveReceizMaterialCompositeLocalFirst } from "./materialSourceFamily.client";
import { publishReceizMaterialCompositeBlobTransport, publishReceizMaterialCompositeTransport } from "./materialCompositePublication.client";
import { jcsCanonicalize } from "@/app/utils/jcs";

const deliveries = new Map<string, Promise<void>>();
type DeliveryOutcome = { origin: string; packageDigest: string; verifyPath: string; sealedArtifactSha256: string; materialToken: string };
const accepted = new Map<string, DeliveryOutcome>();
const receiptSchema = "receiz.material.source-delivery.v1";

/** Delivery mechanics beneath the caller's verified Original. A retained exact
 * package receipt avoids rereading large families; it never admits material or
 * supplies profile permission. Only the selected publication origin is used. */
export async function publishHeldReceizMaterialSourceFamily(proofObjectUrl: string, options: Readonly<{
  origin?: string; fetcher?: typeof fetch; isCurrent?: () => Promise<boolean>;
  expectedSealedArtifactSha256?: string;
}> = {}): Promise<void> {
  const presentation = await resolveReceizMaterialPresentation(proofObjectUrl);
  const packageDigest = readReceizMaterialCompositePackageDigest(presentation.materialToken);
  if (!packageDigest) return; // Self-contained inline capsules need no family transport.
  const origin = new URL(options.origin ?? (typeof window !== "undefined" ? window.location.origin : "https://receiz.com")).origin;
  const key = `${receiptSchema}:${origin}:${packageDigest}`;
  const assertCurrent = async () => { if (options.isCurrent && !await options.isCurrent()) throw Error("PROFILE_SHOWCASE_PUBLICATION_ACCOUNT_CHANGED"); };
  await assertCurrent();
  let receipt: { origin?: string; packageDigest?: string; verifyPath?: string; sealedArtifactSha256?: string; materialToken?: string } | null = null;
  try { receipt = JSON.parse(readDurableLocalTruthItem(key) ?? "null"); } catch { /* damaged delivery state is retried from exact custody */ }
  const path = new URL(presentation.verificationUrl).pathname;
  const bound = (value: typeof receipt) => value?.origin === origin && value.packageDigest === packageDigest
    && value.verifyPath === path && value.materialToken === presentation.materialToken
    && (!options.expectedSealedArtifactSha256 || value.sealedArtifactSha256 === options.expectedSealedArtifactSha256);
  // Existing raw families accept historical RMC1 and streaming RMC2 heads.
  // Bind the receipt to that literal Source token; only the current transport
  // acknowledgement uses the encoding token. Neither rewrites the proof URL.
  const receiptToken = (manifest: ReceizMaterialCompositeManifest) => manifest.capsuleEncoding === "rma3/raw"
    ? presentation.materialToken : `rmc1:${manifest.packageDigest}`;
  const transportToken = (manifest: ReceizMaterialCompositeManifest) => `${manifest.capsuleEncoding === "rma3/raw" ? "rmc2:" : "rmc1:"}${manifest.packageDigest}`;
  if (bound(accepted.get(key) ?? null) || bound(receipt)) return;
  const running = deliveries.get(key);
  if (running) { await running; await assertCurrent(); return publishHeldReceizMaterialSourceFamily(proofObjectUrl, options); }
  const fetcher: typeof fetch = async (input, init) => {
    await assertCurrent();
    const result = await (options.fetcher ?? fetch)(input, init);
    await assertCurrent(); return result;
  };
  const operation: Promise<void> = (async () => {
    // The committed manifest is installed only after every exact segment is
    // retained. A cold device can reuse that outcome without holding media.
    const response = await fetcher(`${origin}/api/proof-material/packages/${packageDigest}/manifest`, { cache: "force-cache", credentials: "omit" });
    let manifest;
    if (response.ok) manifest = await verifyReceizMaterialCompositeManifest(await response.json());
    else {
      if (response.status !== 404) throw Error("PROFILE_SHOWCASE_PUBLIC_MATERIAL_UNAVAILABLE");
      const raw = await openHeldReceizRawMaterialCapsuleBlob(presentation.verificationUrl);
      if (raw) {
        manifest = raw.manifest;
        if (!bound({ origin, packageDigest: manifest.packageDigest, verifyPath: manifest.verifyPath,
          sealedArtifactSha256: manifest.sealedArtifactSha256, materialToken: receiptToken(manifest) })) throw Error("PROFILE_SHOWCASE_PUBLIC_MATERIAL_BINDING_INVALID");
        await publishReceizMaterialCompositeBlobTransport({ origin, fetcher, transport: { manifest,
          manifestBytes: new TextEncoder().encode(jcsCanonicalize(manifest)), capsuleBlob: raw.capsuleBlob, token: transportToken(manifest) } });
      } else {
        const family = await resolveReceizMaterialCompositeLocalFirst({ headUrl: presentation.verificationUrl,
          resolveRemote: async () => { throw Error("PROFILE_SHOWCASE_PUBLIC_MATERIAL_UNAVAILABLE"); } });
        manifest = family.manifest;
        if (!bound({ origin, packageDigest: manifest.packageDigest, verifyPath: manifest.verifyPath,
          sealedArtifactSha256: manifest.sealedArtifactSha256, materialToken: receiptToken(manifest) })) throw Error("PROFILE_SHOWCASE_PUBLIC_MATERIAL_BINDING_INVALID");
        await publishReceizMaterialCompositeTransport({ origin, fetcher, transport: { manifest,
          manifestBytes: new TextEncoder().encode(jcsCanonicalize(manifest)), token: transportToken(manifest),
          segments: manifest.segments.map(segment => family.capsuleBytes.slice(segment.offset, segment.offset + segment.byteLength)) } });
      }
    }
    const outcome = { origin, packageDigest: manifest.packageDigest, verifyPath: manifest.verifyPath,
      sealedArtifactSha256: manifest.sealedArtifactSha256, materialToken: receiptToken(manifest) };
    if (!bound(outcome)) throw Error("PROFILE_SHOWCASE_PUBLIC_MATERIAL_BINDING_INVALID");
    await assertCurrent();
    // This is an exact transport acknowledgment beneath sealed proof authority.
    // A storage-write failure keeps delivery successful but permits later retry.
    try { writeDurableLocalTruthItem(key, JSON.stringify(outcome), { rank: DURABLE_LOCAL_TRUTH_RANK.deterministicSnapshot, source: "receiz-material-composite-delivery" }); } catch { /* exact server custody remains */ }
    accepted.set(key, outcome);
  })().finally(() => { if (deliveries.get(key) === operation) deliveries.delete(key); });
  deliveries.set(key, operation);
  await operation;
}
