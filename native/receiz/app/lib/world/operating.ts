import type {
  AgentCapability,
  AgentMemoryScope,
  WorldAgentView,
  WorldBootstrapView,
  WorldDistrictView,
  WorldLaunchpadChecklistItem,
  WorldProfileSummary,
  WorldReceiptView,
} from "@/app/lib/world/types";

type ProfileIdentity = Pick<WorldProfileSummary, "displayName" | "username"> | null;

const DEFAULT_WORLD_AGENT_CAPABILITIES: readonly AgentCapability[] = [
  "greet",
  "converse",
  "host-space",
  "coordinate",
  "publish",
] as const;

const WORLD_DEFAULT_AGENT_PERSONA_SUFFIX =
  ", the owner's world-facing agent on Receiz. Speak crisply, warmly, and with strong practical judgment. Greet visitors, explain offers, summarize active ventures, and keep continuity without inventing facts. Escalate high-risk or ambiguous commitments back to the owner.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function sameCapabilities(left: readonly AgentCapability[], right: readonly AgentCapability[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

export function buildDefaultWorldAgentPersona(profile: ProfileIdentity): string {
  const displayName = profile?.displayName || profile?.username || "the owner";
  return `You are ${displayName}${WORLD_DEFAULT_AGENT_PERSONA_SUFFIX}`;
}

export function getWorldAgentConfigurationState(
  agent: Pick<WorldAgentView, "displayName" | "systemPersona" | "memoryScope" | "capabilities" | "policy"> | null,
  profile: ProfileIdentity,
): "missing" | "seeded" | "configured" {
  if (!agent || !agent.displayName.trim() || !agent.systemPersona.trim()) return "missing";

  const policy = isRecord(agent.policy) ? agent.policy : null;
  const configuredByOwner = asBoolean(policy?.configuredByOwner);
  const seededBySystem = asBoolean(policy?.seededBySystem);

  if (configuredByOwner === true) return "configured";
  if (seededBySystem === true) return "seeded";

  const expectedDisplayName = profile?.displayName?.trim() || profile?.username?.trim() || "";
  const expectedPersona = buildDefaultWorldAgentPersona(profile);
  const looksSeeded =
    (agent.displayName.trim() === expectedDisplayName || agent.systemPersona.trim() === expectedPersona || agent.systemPersona.trim().endsWith(WORLD_DEFAULT_AGENT_PERSONA_SUFFIX)) &&
    agent.memoryScope === ("relationship" satisfies AgentMemoryScope) &&
    sameCapabilities(agent.capabilities, DEFAULT_WORLD_AGENT_CAPABILITIES);

  return looksSeeded ? "seeded" : "configured";
}

export function buildWorldSetupChecklist(
  bootstrap: Pick<WorldBootstrapView, "profile" | "avatar" | "agent" | "ventures" | "presence">,
  recommendedDistrict: Pick<WorldDistrictView, "title"> | null,
): WorldLaunchpadChecklistItem[] {
  const agentState = getWorldAgentConfigurationState(bootstrap.agent, bootstrap.profile);

  return [
    {
      id: "profile",
      label: "Identity is published",
      detail: "A stable username and public profile give the world something canonical to project.",
      done: Boolean(bootstrap.profile?.username),
    },
    {
      id: "avatar",
      label: "Avatar is forged",
      detail: "Your world-facing body is ready for public rooms, ventures, and resident lists.",
      done: Boolean(bootstrap.avatar?.avatarImageUrl),
    },
    {
      id: "agent",
      label: "Agent policy is owner-configured",
      detail:
        agentState === "configured"
          ? "The runtime voice, memory, and permissions have been intentionally tuned by the owner."
          : agentState === "seeded"
            ? "A default runtime was provisioned so the surface is usable, but it still needs owner tuning."
            : "A clear agent persona prevents the world from feeling like a blank chatbot shell.",
      done: agentState === "configured",
    },
    {
      id: "district",
      label: "Home district is chosen",
      detail: recommendedDistrict ? `Recommended anchor is ${recommendedDistrict.title}.` : "Choose a district to anchor discovery and offers.",
      done: Boolean(bootstrap.presence?.districtId || bootstrap.ventures[0]?.districtId),
    },
    {
      id: "presence",
      label: "Presence is projected",
      detail: "People can only discover you live if your avatar is actually visible somewhere.",
      done: Boolean(bootstrap.presence),
    },
    {
      id: "venture",
      label: "A venture is launched",
      detail: "Ventures convert identity into an actual operating surface with value attached.",
      done: bootstrap.ventures.length > 0,
    },
  ];
}

export function countWorldReceiptsSince(
  receipts: readonly WorldReceiptView[],
  referenceNow: number,
  hours: number,
  predicate?: (receipt: WorldReceiptView) => boolean,
): number {
  const cutoff = referenceNow - hours * 3_600_000;
  return receipts.filter((receipt) => {
    const createdAt = Date.parse(receipt.createdAt);
    if (!Number.isFinite(createdAt) || createdAt < cutoff) return false;
    return predicate ? predicate(receipt) : true;
  }).length;
}

export function isWorldProfileInteractionReceipt(receipt: Pick<WorldReceiptView, "sourceRoute">): boolean {
  return receipt.sourceRoute.startsWith("/api/world/profile/");
}
