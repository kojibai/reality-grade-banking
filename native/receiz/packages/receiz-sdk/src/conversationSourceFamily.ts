import { bindReceizConversationAuthorSourceV125, bindReceizConversationSourceEventsV125, type ReceizConversationAuthorSourceSelectionV125 } from "./conversationActorSource.js";
import { openReceizSubjectSourceFamilyV125, type ReceizSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
import { bindReceizConversationV2Registration, RECEIZ_CONVERSATION_REDUCER_V2_DIGEST } from "./conversationRegistration.js";
import { RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY, RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST } from "./v125ConversationClosureRegistry.generated.js";
import {
  parseReceizConversationEventV1,
  parseReceizConversationEventV2,
  reduceReceizConversationEventsV2,
  type ReceizConversationEventV2,
  type ReceizConversationProjectionV2,
  reduceReceizConversationEventsV1,
  type ReceizConversationProjectionV1,
} from "./conversationDomain.js";
import { receizBase64UrlDecode } from "./identity.js";
import {
  openReceizSourceCarriedReplayFamilyV124,
  projectReceizSourceCarriedReplayBranchesV124,
  type ReceizSourceCarriedReplayFamilyV124,
} from "./sourceCarriedReplay.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import type { ReceizDomainReplaySegmentSourceExpectationV124 } from "./v124ReplayProofObject.js";

const decoder = new TextDecoder("utf-8", { fatal: true });

export type ReceizConversationSourceFamilyV1 = Readonly<{
  replayFamily: ReceizSourceCarriedReplayFamilyV124;
  branches: readonly Readonly<{
    headArtifactSha256: string;
    sourceArtifactSha256s: readonly string[];
    projection: ReceizConversationProjectionV1 | ReceizConversationProjectionV2;
  }>[];
  authority: Readonly<{
    familyIsProofAuthority: false;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function expectedConversationId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || value.length > 512) {
    fail("RECEIZ_CONVERSATION_SOURCE_IDENTITY_INVALID");
  }
  return value;
}

export async function openReceizConversationSourceFamilyV1(input: Readonly<{
  artifacts: readonly ReceizPortableSealedArtifactV124[];
  expected: ReceizDomainReplaySegmentSourceExpectationV124;
  expectedConversationId: string;
  actorSources?: Readonly<{ subjectFamily: ReceizSubjectSourceFamilyV125; authors: readonly Readonly<{
    sourceArtifactSha256: string; selection: ReceizConversationAuthorSourceSelectionV125;
  }>[] }>;
}>): Promise<ReceizConversationSourceFamilyV1> {
  if (!input || typeof input !== "object") fail("RECEIZ_CONVERSATION_SOURCE_INPUT_INVALID");
  const snapshot = structuredClone(input);
  const conversationId = expectedConversationId(snapshot.expectedConversationId);
  const replayFamily = await openReceizSourceCarriedReplayFamilyV124({
    artifacts: snapshot.artifacts,
    expected: snapshot.expected,
  });
  const registeredV2 = replayFamily.registryDigest === RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST
    || replayFamily.reducerDigest === RECEIZ_CONVERSATION_REDUCER_V2_DIGEST
    || replayFamily.sources.some((source) => source.replay.namespace.name === "receiz.chat.conversation.v2");
  if (registeredV2) {
    for (const source of replayFamily.sources) await bindReceizConversationV2Registration(
      RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY,
      { registryDigest: source.replay.registryDigest, reducerDigest: source.replay.reducerDigest, namespace: source.replay.namespace.name },
    );
  }
  if (registeredV2) {
    if (!snapshot.actorSources) fail("RECEIZ_CONVERSATION_ACTOR_SOURCES_REQUIRED");
    const actors = snapshot.actorSources;
    const subjects = await openReceizSubjectSourceFamilyV125({ family: actors.subjectFamily });
    if (actors.authors.length !== replayFamily.sources.length || new Set(actors.authors.map((entry) => entry.sourceArtifactSha256)).size !== actors.authors.length) fail("RECEIZ_CONVERSATION_ACTOR_SOURCE_SET_MISMATCH");
    for (const source of replayFamily.sources) {
      const selected = actors.authors.find((entry) => entry.sourceArtifactSha256 === source.artifactSha256);
      if (!selected) fail("RECEIZ_CONVERSATION_ACTOR_SOURCE_REQUIRED");
      const actor = await bindReceizConversationAuthorSourceV125({ family: subjects, selection: selected.selection, evidence: source.authoringEvidence, authority: source.sourceAuthority });
      await bindReceizConversationSourceEventsV125(source.replay.additions, actor, undefined, source.replay);
    }
  }
  const replayBranches = projectReceizSourceCarriedReplayBranchesV124(replayFamily);
  const branches = await Promise.all(replayBranches.map(async (branch) => {
    const events = [];
    for (const addition of branch.additions) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(decoder.decode(receizBase64UrlDecode(addition.exactEventBytesB64u)));
      } catch {
        return fail("RECEIZ_CONVERSATION_SOURCE_EVENT_INVALID");
      }
      const event = registeredV2 ? await parseReceizConversationEventV2(parsedJson) : await parseReceizConversationEventV1(parsedJson);
      if (event.conversationId !== conversationId) {
        fail("RECEIZ_CONVERSATION_SOURCE_IDENTITY_MISMATCH");
      }
      events.push(event);
    }
    const projection = registeredV2
      ? await reduceReceizConversationEventsV2(events as ReceizConversationEventV2[])
      : await reduceReceizConversationEventsV1(events as Awaited<ReturnType<typeof parseReceizConversationEventV1>>[]);
    if (projection.conversationId !== conversationId) {
      fail("RECEIZ_CONVERSATION_SOURCE_IDENTITY_MISMATCH");
    }
    return Object.freeze({
      headArtifactSha256: branch.headArtifactSha256,
      sourceArtifactSha256s: branch.sourceArtifactSha256s,
      projection,
    });
  }));
  return Object.freeze({
    replayFamily,
    branches: Object.freeze(branches),
    authority: Object.freeze({
      familyIsProofAuthority: false as const,
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}
