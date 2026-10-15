import { ReceizError } from "./errors.js";

export type ReceizEmulatorFailureName =
  | "network_unavailable"
  | "request_timeout"
  | "duplicate_delivery"
  | "stale_projection"
  | "persistence_interrupted";

export type ReceizEmulatorSnapshot = Readonly<{
  schema: "receiz.sdk.emulator_snapshot.v1";
  seed: string;
  nowMs: number;
  randomState: number;
  identities: readonly ReceizSandboxIdentity[];
  records: readonly ReceizSandboxRecord[];
  proofs: readonly ReceizSandboxProof[];
  proofMemory: readonly Readonly<{ ownerId: string; entries: readonly unknown[] }>[];
  webhookIds: readonly string[];
  checkouts: readonly ReceizSandboxCheckout[];
  publicStore: readonly Readonly<{ key: string; ownerId: string; namespace: string; value: unknown; headReference: string; revision: number }>[];
  failureOccurrences: Readonly<Partial<Record<ReceizEmulatorFailureName, number>>>;
  authority: "sandbox-beneath-sealed-receiz-proof-object";
}>;

export type ReceizSandboxIdentity = Readonly<{
  id: string;
  label: string;
  namespace: "sandbox.receiz.test";
  sandboxIdentity: true;
  createdAtMs: number;
}>;

export type ReceizSandboxContinuity = Readonly<{
  ownerId: string;
  namespace: string;
  artifactId: string;
  priorHeadReference: string | null;
}>;

export type ReceizSandboxRecord = Readonly<{
  id: string;
  payload: unknown;
  continuity: ReceizSandboxContinuity;
  createdAtMs: number;
}>;

export type ReceizSandboxProof = Readonly<{
  id: string;
  issuer: string;
  ownerId: string;
  namespace: string;
  artifactId: string;
  priorHeadReference: string | null;
  headReference: string;
  payload: unknown;
  digest: string;
  sealedAtMs: number;
}>;

export type ReceizSandboxCheckout = Readonly<{
  idempotencyKey: string;
  amountMinor: number;
  outcome: "funded" | "declined";
  createdAtMs: number;
}>;

export type ReceizEmulatorOptions = Readonly<{
  seed: string;
  startTimeMs?: number;
  snapshot?: ReceizEmulatorSnapshot;
  failurePlan?: Partial<Record<ReceizEmulatorFailureName, readonly number[]>>;
}>;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

function digest(value: unknown): string {
  const input = canonical(value);
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5];
  return seeds.map((seed) => {
    let state = seed;
    for (let index = 0; index < input.length; index += 1) {
      state ^= input.charCodeAt(index);
      state = Math.imul(state, 0x01000193);
      state ^= state >>> 13;
    }
    return (state >>> 0).toString(16).padStart(8, "0");
  }).join("");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function seedState(seed: string): number {
  return Number.parseInt(digest(seed).slice(0, 8), 16) || 0x9e3779b9;
}

export function createReceizEmulator(options: ReceizEmulatorOptions) {
  const restored = options.snapshot;
  const seed = restored?.seed ?? options.seed;
  let nowMs = restored?.nowMs ?? options.startTimeMs ?? 1_700_000_000_000;
  let randomState = restored?.randomState ?? seedState(seed);
  const identities = new Map((restored?.identities ?? []).map((value) => [value.id, clone(value)]));
  const records = new Map((restored?.records ?? []).map((value) => [value.id, clone(value)]));
  const proofs = new Map((restored?.proofs ?? []).map((value) => [value.id, clone(value)]));
  const memory = new Map((restored?.proofMemory ?? []).map((value) => [value.ownerId, clone([...value.entries])]));
  const webhookIds = new Set(restored?.webhookIds ?? []);
  const checkouts = new Map((restored?.checkouts ?? []).map((value) => [value.idempotencyKey, clone(value)]));
  const publicStore = new Map((restored?.publicStore ?? []).map((value) => [value.key, clone(value)]));
  const failureOccurrences: Partial<Record<ReceizEmulatorFailureName, number>> = { ...(restored?.failureOccurrences ?? {}) };
  const ownerHeads = new Map<string, string>();
  for (const proof of proofs.values()) ownerHeads.set(proof.ownerId, proof.headReference);

  const tick = () => ++nowMs;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return randomState >>> 0;
  };
  const id = (kind: string, basis: string) => `sandbox_${kind}_${digest(`${seed}:${basis}:${random()}`).slice(0, 20)}`;
  const maybeFail = (name: ReceizEmulatorFailureName) => {
    const occurrence = (failureOccurrences[name] ?? 0) + 1;
    failureOccurrences[name] = occurrence;
    if (!(options.failurePlan?.[name] ?? []).includes(occurrence)) return;
    throw new ReceizError(name, name, {
      rail: "testing",
      retryable: name === "network_unavailable" || name === "request_timeout" || name === "persistence_interrupted",
      suggestedRepair: "Adjust the deterministic emulator failure plan and rerun the sandbox operation.",
      authorityBoundary: "sandbox-failure-beneath-receiz-proof-object-truth",
    });
  };

  const api = {
    identity: {
      create(label: string): ReceizSandboxIdentity {
        const normalized = label.trim();
        if (!normalized) throw new ReceizError("sandbox_identity_label_required", "sandbox_identity_label_required", { rail: "testing" });
        const identityId = `sandbox:${digest(`${seed}:identity:${normalized}`).slice(0, 24)}`;
        const existing = identities.get(identityId);
        if (existing) return clone(existing);
        const identity: ReceizSandboxIdentity = {
          id: identityId,
          label: normalized,
          namespace: "sandbox.receiz.test",
          sandboxIdentity: true,
          createdAtMs: tick(),
        };
        identities.set(identity.id, identity);
        return clone(identity);
      },
    },
    proof: {
      record(input: Readonly<{ ownerId: string; payload: unknown }>): ReceizSandboxRecord {
        if (!identities.has(input.ownerId) || input.ownerId.endsWith(".receiz.id")) {
          throw new ReceizError("sandbox_identity_required", "sandbox_identity_required", { rail: "testing" });
        }
        const artifactId = id("artifact", `${input.ownerId}:${canonical(input.payload)}`);
        const record: ReceizSandboxRecord = {
          id: id("record", artifactId),
          payload: clone(input.payload),
          continuity: {
            ownerId: input.ownerId,
            namespace: `sandbox/${input.ownerId}`,
            artifactId,
            priorHeadReference: ownerHeads.get(input.ownerId) ?? null,
          },
          createdAtMs: tick(),
        };
        records.set(record.id, record);
        return clone(record);
      },
      async seal(recordId: string): Promise<Readonly<{ sandboxVerified: true; proof: ReceizSandboxProof }>> {
        const record = records.get(recordId);
        if (!record) throw new ReceizError("continuity_record_required", "continuity_record_required", { rail: "testing" });
        const proofBasis = {
          issuer: record.continuity.ownerId,
          ownerId: record.continuity.ownerId,
          namespace: record.continuity.namespace,
          artifactId: record.continuity.artifactId,
          priorHeadReference: record.continuity.priorHeadReference,
          payload: record.payload,
        };
        const proofDigest = digest(proofBasis);
        const proof: ReceizSandboxProof = {
          id: id("proof", record.id),
          ...proofBasis,
          headReference: `sandbox-head:${proofDigest}`,
          digest: proofDigest,
          sealedAtMs: tick(),
        };
        proofs.set(proof.id, proof);
        ownerHeads.set(proof.ownerId, proof.headReference);
        return { sandboxVerified: true, proof: clone(proof) };
      },
      append(proofId: string, value: unknown) {
        const proof = proofs.get(proofId);
        if (!proof) throw new ReceizError("sandbox_proof_required", "sandbox_proof_required", { rail: "testing" });
        const priorHeadReference = proof.headReference;
        const sequence = 1 + [...proofs.values()].filter((candidate) => candidate.artifactId === proof.artifactId && candidate.priorHeadReference !== null).length;
        const headReference = `sandbox-head:${digest({ priorHeadReference, sequence, value })}`;
        proofs.set(proofId, { ...proof, priorHeadReference, headReference });
        ownerHeads.set(proof.ownerId, headReference);
        return { sandboxVerified: true as const, sequence, priorHeadReference, headReference };
      },
      inspect(candidate: ReceizSandboxProof) {
        const expected = digest({
          issuer: candidate.issuer,
          ownerId: candidate.ownerId,
          namespace: candidate.namespace,
          artifactId: candidate.artifactId,
          priorHeadReference: candidate.priorHeadReference,
          payload: candidate.payload,
        });
        if (candidate.digest !== expected) throw new ReceizError("sandbox_proof_tampered", "sandbox_proof_tampered", { rail: "testing" });
        return { sandboxVerified: true as const, digest: expected };
      },
    },
    proofMemory: {
      open(ownerId: string) {
        if (!memory.has(ownerId)) memory.set(ownerId, []);
        return {
          async add(value: unknown) {
            maybeFail("persistence_interrupted");
            memory.get(ownerId)!.push(clone(value));
            return { sandboxPersisted: true as const, count: memory.get(ownerId)!.length };
          },
          entries: () => clone(memory.get(ownerId) ?? []),
          close: () => ({ sandboxClosed: true as const, count: memory.get(ownerId)?.length ?? 0 }),
        };
      },
    },
    publicStore: {
      publish(input: Readonly<{ ownerId: string; namespace: string; value: unknown }>) {
        maybeFail("network_unavailable");
        if (!identities.has(input.ownerId)) throw new ReceizError("sandbox_identity_required", "sandbox_identity_required", { rail: "testing" });
        const key = `${input.ownerId}:${input.namespace}`;
        const previous = publicStore.get(key);
        const revision = (previous?.revision ?? 0) + 1;
        const entry = {
          key,
          ownerId: input.ownerId,
          namespace: input.namespace,
          value: clone(input.value),
          headReference: `sandbox-store-head:${digest({ key, revision, value: input.value, prior: previous?.headReference ?? null })}`,
          revision,
        };
        publicStore.set(key, entry);
        return { sandboxPublished: true as const, ...clone(entry) };
      },
      restore(input: Readonly<{ ownerId: string; namespace: string }>) {
        maybeFail("stale_projection");
        const entry = publicStore.get(`${input.ownerId}:${input.namespace}`);
        if (!entry) throw new ReceizError("sandbox_public_store_missing", "sandbox_public_store_missing", { rail: "testing" });
        return { sandboxRestored: true as const, ...clone(entry) };
      },
    },
    webhooks: {
      createEnvelope(event: Readonly<{ id: string; type: string }>) {
        return { event: clone(event), signature: `sandbox-signature:${digest({ seed, event })}` };
      },
      deliver(input: Readonly<{ id: string; type: string }> | Readonly<{ event: Readonly<{ id: string; type: string }>; signature: string }>) {
        maybeFail("duplicate_delivery");
        const envelope = "event" in input ? input : { event: input, signature: `sandbox-signature:${digest({ seed, event: input })}` };
        const expected = `sandbox-signature:${digest({ seed, event: envelope.event })}`;
        if (envelope.signature !== expected) throw new ReceizError("sandbox_webhook_tampered", "sandbox_webhook_tampered", { rail: "testing" });
        const event = envelope.event;
        const duplicate = webhookIds.has(event.id);
        webhookIds.add(event.id);
        return { sandboxDelivered: true as const, duplicate, event: clone(event), deliveredAtMs: duplicate ? null : tick() };
      },
    },
    commerce: {
      checkout(input: Readonly<{ idempotencyKey: string; amountMinor: number }>) {
        maybeFail("request_timeout");
        const existing = checkouts.get(input.idempotencyKey);
        if (existing) return { sandboxCheckout: true as const, duplicate: true, ...clone(existing) };
        const checkout: ReceizSandboxCheckout = {
          idempotencyKey: input.idempotencyKey,
          amountMinor: input.amountMinor,
          outcome: input.amountMinor > 0 ? "funded" : "declined",
          createdAtMs: tick(),
        };
        checkouts.set(checkout.idempotencyKey, checkout);
        return { sandboxCheckout: true as const, duplicate: false, ...clone(checkout) };
      },
    },
    clock: {
      now: () => nowMs,
      advance(milliseconds = 1) {
        if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new ReceizError("sandbox_clock_advance_invalid", "sandbox_clock_advance_invalid", { rail: "testing" });
        nowMs += milliseconds;
        return nowMs;
      },
    },
    snapshot(): ReceizEmulatorSnapshot {
      return {
        schema: "receiz.sdk.emulator_snapshot.v1",
        seed,
        nowMs,
        randomState,
        identities: [...identities.values()].sort((a, b) => a.id.localeCompare(b.id)).map(clone),
        records: [...records.values()].sort((a, b) => a.id.localeCompare(b.id)).map(clone),
        proofs: [...proofs.values()].sort((a, b) => a.id.localeCompare(b.id)).map(clone),
        proofMemory: [...memory.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ownerId, entries]) => ({ ownerId, entries: clone(entries) })),
        webhookIds: [...webhookIds].sort(),
        checkouts: [...checkouts.values()].sort((a, b) => a.idempotencyKey.localeCompare(b.idempotencyKey)).map(clone),
        publicStore: [...publicStore.values()].sort((a, b) => a.key.localeCompare(b.key)).map(clone),
        failureOccurrences: { ...failureOccurrences },
        authority: "sandbox-beneath-sealed-receiz-proof-object",
      };
    },
    restore(snapshot: ReceizEmulatorSnapshot) {
      const replacement = createReceizEmulator({
        seed: snapshot.seed,
        snapshot,
        ...(options.failurePlan ? { failurePlan: options.failurePlan } : {}),
      });
      return replacement;
    },
  };
  return api;
}
