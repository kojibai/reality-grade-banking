import { buildWorldSetupChecklist } from "@/app/lib/world/operating";
import type {
  AgentCapability,
  AgentMemoryScope,
  AvatarVisualStyle,
  WorldBootstrapView,
  WorldDistrictView,
  WorldLaunchpadView,
  WorldProfileSummary,
} from "@/app/lib/world/types";

const LOCAL_WORLD_LAUNCHPAD_GENERATED_AT = "1970-01-01T00:00:00.000Z";

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) return trimmed;
  }
  return null;
}

function readinessLabel(score: number): string {
  if (score >= 100) return "World live";
  if (score >= 80) return "Launch ready";
  if (score >= 55) return "Strong foundation";
  return "Setup in motion";
}

function readinessSummary(checklist: ReturnType<typeof buildWorldSetupChecklist>, score: number): string {
  const missing = checklist.filter((item) => !item.done).map((item) => item.label.toLowerCase());
  if (!missing.length) return "Your local World register can already project identity, presence, and action.";
  if (score < 55) return `Finish ${missing.slice(0, 2).join(" and ")} to make this World fully operational.`;
  return `You are close. Finish ${missing.slice(0, 2).join(" and ")} to complete this World.`;
}

function chooseRecommendedDistrict(bootstrap: WorldBootstrapView): WorldDistrictView | null {
  const preferredId = firstNonEmpty(bootstrap.presence?.districtId, bootstrap.ventures[0]?.districtId);
  if (preferredId) {
    const byId = bootstrap.districts.find((district) => district.id === preferredId) ?? null;
    if (byId) return byId;
  }

  const preferredSlug = firstNonEmpty(bootstrap.ventures[0]?.districtSlug);
  if (preferredSlug) {
    const bySlug = bootstrap.districts.find((district) => district.slug === preferredSlug) ?? null;
    if (bySlug) return bySlug;
  }

  return bootstrap.districts[0] ?? null;
}

function localAvatarStyle(bootstrap: WorldBootstrapView): AvatarVisualStyle {
  return bootstrap.avatar?.visualStyle ?? "photoreal";
}

function localMemoryScope(bootstrap: WorldBootstrapView): AgentMemoryScope {
  return bootstrap.agent?.memoryScope ?? "relationship";
}

function localAgentCapabilities(bootstrap: WorldBootstrapView): AgentCapability[] {
  return bootstrap.agent?.capabilities.length
    ? bootstrap.agent.capabilities
    : ["greet", "converse", "host-space", "coordinate", "publish"];
}

function profileHandle(profile: WorldProfileSummary): string {
  return `@${profile.username}`;
}

export function buildLocalWorldLaunchpadView(
  bootstrap: WorldBootstrapView,
  generatedAt = LOCAL_WORLD_LAUNCHPAD_GENERATED_AT,
): WorldLaunchpadView | null {
  const profile = bootstrap.profile;
  if (!profile) return null;

  const recommendedDistrict = chooseRecommendedDistrict(bootstrap);
  const checklist = buildWorldSetupChecklist(bootstrap, recommendedDistrict);
  const completed = checklist.filter((item) => item.done).length;
  const readinessScore = Math.round((completed / Math.max(1, checklist.length)) * 100);
  const displayName = firstNonEmpty(profile.displayName, profile.username) ?? "Receiz";
  const handle = profileHandle(profile);
  const districtTitle = recommendedDistrict?.title ?? "Receiz World";
  const districtSlug = recommendedDistrict?.slug ?? null;
  const districtId = recommendedDistrict?.id ?? null;
  const ventureTitle = bootstrap.ventures[0]?.title?.trim() || `${displayName} presence`;
  const presenceActivity = bootstrap.presence?.activity?.trim() || `${displayName} is open for verified conversations.`;

  return {
    generatedAt,
    readinessScore,
    readinessLabel: readinessLabel(readinessScore),
    readinessSummary: readinessSummary(checklist, readinessScore),
    headline: `${handle} is live from the local World register.`,
    subhead: `${displayName} can project identity, presence, and next actions from held proof before network enrichment arrives.`,
    recommendedDistrictId: districtId,
    recommendedDistrictSlug: districtSlug,
    recommendedDistrictTitle: recommendedDistrict?.title ?? null,
    recommendedDistrictReason: recommendedDistrict
      ? `${districtTitle} is the strongest local anchor currently held by this World.`
      : "Choose a district when you want the World to route discovery more precisely.",
    avatarBrief: {
      visualStyle: localAvatarStyle(bootstrap),
      prompt: `Create a premium, recognizable Receiz World avatar for ${displayName}, grounded in the verified profile and ready for ${districtTitle}.`,
      rationale: "This brief is derived from the local World register, so the forge has a truthful starting point immediately.",
    },
    agentBrief: {
      displayName: bootstrap.agent?.displayName ?? displayName,
      systemPersona:
        bootstrap.agent?.systemPersona ||
        `You are ${displayName}'s Receiz World agent. Speak from verified local profile, presence, ventures, and receipts only. Route uncertainty back to the owner.`,
      memoryScope: localMemoryScope(bootstrap),
      capabilities: localAgentCapabilities(bootstrap),
      rationale: "The local agent brief starts from held identity and actions, then server sync may add stronger appends later.",
    },
    ventureDrafts: [
      {
        title: ventureTitle,
        summary: bootstrap.ventures[0]?.summary?.trim() || `Turn ${handle}'s verified profile into a concrete World offer.`,
        visibility: bootstrap.ventures[0]?.visibility ?? "public",
        districtId,
        districtSlug,
        districtTitle: recommendedDistrict?.title ?? null,
        rationale: "The first draft is projected locally so action can start before remote enrichment.",
      },
    ],
    presenceDrafts: [
      {
        activity: presenceActivity,
        roomLabel: bootstrap.presence?.roomId ?? recommendedDistrict?.title ?? null,
        districtId,
        districtSlug,
        districtTitle: recommendedDistrict?.title ?? null,
        rationale: "Presence is a deterministic projection of what this node already holds.",
      },
    ],
    highlights: [
      {
        label: "Local identity",
        value: handle,
        detail: "The World profile is projected from local signed-in truth.",
      },
      {
        label: "Ventures",
        value: String(bootstrap.ventures.length),
        detail: "Operating surfaces already held by the local World register.",
      },
      {
        label: "Receipts",
        value: String(bootstrap.receipts.length),
        detail: "Append-only World actions already available for replay.",
      },
      {
        label: "Presence",
        value: bootstrap.presence ? "Projected" : "Pending",
        detail: "Presence can be authored locally and propagated later.",
      },
    ],
    checklist,
    suggestedQuestions: [
      "What should my World agent say first?",
      `What should ${districtTitle} do for my profile?`,
      "Turn my local profile into a stronger offer.",
      "Which setup step should I finish next?",
    ],
  };
}
