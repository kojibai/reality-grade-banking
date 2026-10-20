export type Plan = "free" | "premium" | "business" | "pro" | "enterprise";
export type BillablePlan = Exclude<Plan, "free" | "enterprise">;
export type LegacySessionPlan = "free" | "premium";
export type PublicPlanLabel = "Free" | "Premium" | "Business" | "Automation" | "Enterprise";
export type PlanStageLabel = "All Receiz" | "Create + deploy" | "Own it" | "Run it" | "Scale it";
export type SessionPlanLike = {
  plan?: unknown;
  entitlementPlan?: unknown;
} | null | undefined;

export function normalizePlan(value: unknown): Plan {
  return value === "free" || value === "premium" || value === "business" || value === "pro" || value === "enterprise"
    ? value
    : "free";
}

export function planRank(plan: Plan): number {
  switch (plan) {
    case "free":
      return 0;
    case "premium":
      return 1;
    case "business":
      return 2;
    case "pro":
      return 3;
    case "enterprise":
      return 4;
  }
}

export function legacySessionPlan(plan: Plan): LegacySessionPlan {
  return plan === "free" ? "free" : "premium";
}

export function hasPremiumAccess(plan: Plan): boolean {
  return planRank(plan) >= planRank("premium");
}

/** Receiz core is available to every plan, including Free. */
export function canUseReceizCore(): true {
  return true;
}

/** Authorship is a universal Receiz capability, not a paid entitlement. */
export function canUseUniversalAuthorship(): true {
  return true;
}

/** Creator production and owned Twin setup begin at Premium. */
export function canUseCreatorProduction(plan: Plan): boolean {
  return planRank(plan) >= planRank("premium");
}

export const canSetUpOwnedTwin = canUseCreatorProduction;
export const canDeployOwnedTwin = canUseCreatorProduction;
export const canOperateOwnedTwin = canUseCreatorProduction;

/** Business enables the Receiz custom domain, staff routing, and multi-site operation. */
export function canUseBusinessTwinOperations(plan: Plan): boolean {
  return planRank(plan) >= planRank("business");
}

/** The Receiz custom-domain identity surface begins at Business. */
export function canUseBusinessCustomDomain(plan: Plan): boolean {
  return planRank(plan) >= planRank("business");
}

/** Automation enables advanced workflow execution, policy, channels, and capacity. */
export function canUseAdvancedAutomation(plan: Plan): boolean {
  return planRank(plan) >= planRank("pro");
}

/** Production API access begins at Business. */
export function canUseProductionApi(plan: Plan): boolean {
  return planRank(plan) >= planRank("business");
}

/** Enterprise controls remain exclusive to Enterprise. */
export function canUseEnterpriseApiControls(plan: Plan): boolean {
  return plan === "enterprise";
}

export function hasBusinessAccess(plan: Plan): boolean {
  return planRank(plan) >= planRank("business");
}

export function hasAutomationAccess(plan: Plan): boolean {
  return planRank(plan) >= planRank("pro");
}

export function isProPlan(plan: Plan): boolean {
  return planRank(plan) >= planRank("pro");
}

export function planLabel(plan: Plan): PublicPlanLabel {
  if (plan === "enterprise") return "Enterprise";
  if (plan === "pro") return "Automation";
  if (plan === "business") return "Business";
  if (plan === "premium") return "Premium";
  return "Free";
}

export function planStageLabel(plan: Plan): PlanStageLabel {
  if (plan === "enterprise") return "Scale it";
  if (plan === "pro") return "Run it";
  if (plan === "business") return "Own it";
  if (plan === "premium") return "Create + deploy";
  return "All Receiz";
}

export function effectivePlanFromSession(session: SessionPlanLike): Plan {
  if (!session) return "free";
  const base = normalizePlan(session.plan);
  const entitled = normalizePlan(session.entitlementPlan);
  return planRank(entitled) > planRank(base) ? entitled : base;
}
