import { sha256Hex } from "@/app/utils/sha256";

/** Existing document-seal local anchor primitive. Shared persistence may append
 * beneath this file-carried binding; it is never required to produce it. */
export async function computeReceizLocalSealAnchorId(input: {
  code: string; pulse: string; claimSha256Hex: string; artifactSha256Basis: string;
}): Promise<string> {
  return (await sha256Hex(`${input.code}:${input.pulse}:${input.claimSha256Hex}:${input.artifactSha256Basis}`)).slice(0, 8);
}
