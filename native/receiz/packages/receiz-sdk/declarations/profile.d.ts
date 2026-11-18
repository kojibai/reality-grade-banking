export { projectReceizAccountDisplayName } from "./accountDisplayName.js";
export type ReceizProfileUpdateInput = Readonly<{
    username?: string;
    displayName?: string | null;
    bio?: string | null;
    location?: string | null;
    websiteUrl?: string | null;
    /** Ordered named links; omission preserves the current list, [] clears it. Maximum 20, label 80 characters, HTTPS URL 2048 characters; no credentials. */
    links?: readonly Readonly<{
        label: string;
        url: string;
    }>[];
    socialXUrl?: string | null;
    socialInstagramUrl?: string | null;
    socialYoutubeUrl?: string | null;
    socialLinkedinUrl?: string | null;
    socialGithubUrl?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    isPrivate?: boolean;
    showSchedulerButton?: boolean;
}>;
export type ReceizProfileUpdateResult = Readonly<{
    schema: "receiz.profile.update.result.v108";
    status: "updated";
    accountUid: string;
    profilePath: string;
    profile: Readonly<Record<string, unknown>>;
}>;
export type ReceizUsernameAvailability = Readonly<{
    normalized: string;
    available: boolean;
    isCurrent: boolean;
    reason: "ok" | "invalid" | "taken";
    suggestions: readonly string[];
}>;
export declare function parseReceizProfileUpdateResult(value: unknown): ReceizProfileUpdateResult;
export declare function parseReceizUsernameAvailability(value: unknown): ReceizUsernameAvailability;
//# sourceMappingURL=profile.d.ts.map