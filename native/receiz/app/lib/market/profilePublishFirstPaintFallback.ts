"use client";

import firstPaintProofObjectJson from "@/app/lib/firstPaint/receizFirstPaintProof.v1.json";
import { resolveFirstPaintProofObjectImport } from "@/app/lib/firstPaint/proofObjectImport";
import { buildMarketDeskSnapshotFromTransport } from "@/app/lib/market/compose";
import type { MarketDeskSnapshot, MarketDeskSnapshotTransport } from "@/app/lib/market/types";

type FirstPaintProofObject = {
  schema?: string;
  payloadSha256?: string;
  profiles?: unknown;
  marketTransport?: MarketDeskSnapshotTransport;
};

type VerifiedFirstPaintProofObject = {
  schema: "receiz.first_paint.proof_object.v1";
  payloadSha256: string;
  profiles: unknown;
  marketTransport: MarketDeskSnapshotTransport;
};

const FIRST_PAINT_PROOF_OBJECT = resolveFirstPaintProofObjectImport(
  firstPaintProofObjectJson,
) as FirstPaintProofObject | null;

let verifiedFirstPaintProofObjectPromise: Promise<VerifiedFirstPaintProofObject | null> | null = null;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function sha256Hex(value: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifiedFirstPaintProofObject(): Promise<VerifiedFirstPaintProofObject | null> {
  if (verifiedFirstPaintProofObjectPromise) return await verifiedFirstPaintProofObjectPromise;

  verifiedFirstPaintProofObjectPromise = (async () => {
    const proofObject = FIRST_PAINT_PROOF_OBJECT;
    if (proofObject?.schema !== "receiz.first_paint.proof_object.v1") return null;
    if (!proofObject.payloadSha256 || !proofObject.profiles || !proofObject.marketTransport) return null;
    const payloadSha256 = await sha256Hex(
      JSON.stringify({
        profiles: proofObject.profiles,
        marketTransport: proofObject.marketTransport,
      }),
    );
    return payloadSha256 && payloadSha256 === proofObject.payloadSha256
      ? (proofObject as VerifiedFirstPaintProofObject)
      : null;
  })();

  return await verifiedFirstPaintProofObjectPromise;
}

async function firstPaintPayloadVerified(): Promise<boolean> {
  return Boolean(await verifiedFirstPaintProofObject());
}

export async function buildMarketSnapshotFromFirstPaintProofObject(): Promise<MarketDeskSnapshot | null> {
  if (!(await firstPaintPayloadVerified())) return null;
  const proofObject = await verifiedFirstPaintProofObject();
  if (!proofObject) return null;
  const transport = proofObject.marketTransport;
  if (!transport || !Array.isArray(transport.publicOriginals) || transport.publicOriginals.length === 0) return null;

  return buildMarketDeskSnapshotFromTransport(cloneJson({
    ...transport,
    generatedAt: new Date().toISOString(),
  }));
}
