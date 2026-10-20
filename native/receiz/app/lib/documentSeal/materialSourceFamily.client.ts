"use client";

import {
  RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY,
  RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY,
  decodeReceizRawMaterialCapsuleBytes,
  resolveReceizMaterialCompositeFromSources,
} from "../../../packages/receiz-sdk/src/materialSourceFamily";
import {
  readReceizMaterialCompositePackageDigest,
  type ReceizMaterialCompositeManifest,
} from "../../../packages/receiz-sdk/src/materialCompositeTransport";
import {
  readHeldReceizMaterialSourceFamily,
  resolveHeldReceizMaterialComposite,
} from "@/app/lib/documentSeal/materialSourceCustody.client";

export type ReceizResolvedMaterialComposite = Readonly<{
  manifest: ReceizMaterialCompositeManifest;
  capsuleBytes: Uint8Array;
}>;

export type ReceizLocalFirstMaterialCompositeResolution =
  ReceizResolvedMaterialComposite & Readonly<{ source: "held" | "remote" }>;

export { decodeReceizRawMaterialCapsuleBytes };

function fragmentFields(value: string): URLSearchParams {
  const url = new URL(value, "https://receiz.com");
  return new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
}

function carriesHeldSource(value: string): boolean {
  const fields = fragmentFields(value);
  return fields.has(RECEIZ_MATERIAL_MANIFEST_SOURCE_FRAGMENT_KEY)
    || fields.has(RECEIZ_MATERIAL_SEGMENT_SOURCE_FRAGMENT_KEY);
}

export function carriesReceizHeldMaterialSources(input: Readonly<{
  headUrl: string;
  sourceUrls?: readonly string[];
}>): boolean {
  return carriesHeldSource(input.headUrl)
    || (input.sourceUrls ?? []).some(carriesHeldSource);
}

/**
 * Complete content-bearing source families outrank transport discovery. Once a
 * caller supplies any held source field, the family must verify completely or
 * fail closed; remote bytes are never mixed into an incomplete held family.
 */
export async function resolveReceizMaterialCompositeLocalFirst(input: Readonly<{
  headUrl: string;
  sourceUrls?: readonly string[];
  resolveRemote: (coordinates: Readonly<{
    packageDigest: string;
    origin: string;
  }>) => Promise<ReceizResolvedMaterialComposite>;
}>): Promise<ReceizLocalFirstMaterialCompositeResolution> {
  const sourceUrls = input.sourceUrls ?? [];
  const head = new URL(input.headUrl, "https://receiz.com");
  const materialTokens = fragmentFields(input.headUrl).getAll("material");
  const packageDigest = materialTokens.length === 1
    ? readReceizMaterialCompositePackageDigest(materialTokens[0]!)
    : null;
  if (!packageDigest) {
    throw new TypeError("RECEIZ_MATERIAL_SOURCE_HEAD_INVALID");
  }

  if (carriesReceizHeldMaterialSources({ headUrl: input.headUrl, sourceUrls })) {
    const resolved = await resolveReceizMaterialCompositeFromSources({
      headUrl: input.headUrl,
      sourceUrls,
    });
    return Object.freeze({ ...resolved, source: "held" as const });
  }

  const held = await readHeldReceizMaterialSourceFamily(packageDigest);
  if (held) {
    if (held.storageKind === "blob-segments") {
      const resolved = await resolveHeldReceizMaterialComposite(input.headUrl);
      if (!resolved) throw new TypeError("RECEIZ_MATERIAL_SOURCE_FAMILY_INCOMPLETE");
      return Object.freeze({ ...resolved, source: "held" as const });
    }
    const resolved = await resolveReceizMaterialCompositeFromSources({
      headUrl: input.headUrl,
      sourceUrls: held.sourceUrls,
    });
    return Object.freeze({ ...resolved, source: "held" as const });
  }

  const resolved = await input.resolveRemote({
    packageDigest,
    origin: head.origin,
  });
  return Object.freeze({ ...resolved, source: "remote" as const });
}
