import { usernameWithNumericSuffix } from "./username";

export type LocalProfileNamePreference = Readonly<{ preferredUsername: string | null; preferredDisplayName: string | null }>;

/** The existing continuation helper's exact 24 attempts and UTF-16 slice.
 * Input admission remains with the existing continuation route.
 */
export function localProfileNamePreservationPatches(input: LocalProfileNamePreference): readonly Readonly<Partial<Record<"username" | "display_name", string>>>[] {
  if (!input.preferredUsername && !input.preferredDisplayName) return [];
  const patch: Partial<Record<"username" | "display_name", string>> = {};
  if (input.preferredUsername) patch.username = input.preferredUsername;
  if (input.preferredDisplayName) patch.display_name = input.preferredDisplayName.slice(0, 80);
  return Array.from({ length: 24 }, (_, attempt) => {
    const candidate = input.preferredUsername && attempt > 0
      ? usernameWithNumericSuffix(input.preferredUsername, attempt) : input.preferredUsername;
    return Object.freeze(candidate ? { ...patch, username: candidate } : { ...patch });
  });
}
