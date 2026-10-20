"use client";

import { getKaiTimeSource } from "@/app/utils/kai_pulse";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { sha256Hex } from "@/app/utils/sha256";
import { normalizeProfileUsername } from "@/app/lib/profile/username";

export const PROFILE_USERNAME_APPEND_SCHEMA = "receiz.identity.username-append.v1" as const;
const PROFILE_USERNAME_APPEND_REGISTER_KEY = "receiz.profile.username-append.register.v1";

export type ProfileUsernameAppend = Readonly<{
  schema: typeof PROFILE_USERNAME_APPEND_SCHEMA;
  profileUserId: string;
  username: string;
  normalizedUsername: string;
  originBaseSeedHash: string;
  predecessorAppendHash: string | null;
  kaiMicroPulse: string;
  kaiPulse: string;
  appendHash: string;
}>;

type UsernameAppendRegister = Record<string, ProfileUsernameAppend>;

function validHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function validAppendShape(value: unknown): value is ProfileUsernameAppend {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ProfileUsernameAppend>;
  return item.schema === PROFILE_USERNAME_APPEND_SCHEMA
    && typeof item.profileUserId === "string" && Boolean(item.profileUserId.trim())
    && typeof item.username === "string" && Boolean(item.username.trim())
    && typeof item.normalizedUsername === "string" && Boolean(item.normalizedUsername)
    && validHex64(item.originBaseSeedHash)
    && (item.predecessorAppendHash === null || validHex64(item.predecessorAppendHash))
    && typeof item.kaiMicroPulse === "string" && /^\d+$/u.test(item.kaiMicroPulse)
    && typeof item.kaiPulse === "string" && /^\d+$/u.test(item.kaiPulse)
    && validHex64(item.appendHash);
}

function readRegister(): UsernameAppendRegister {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(PROFILE_USERNAME_APPEND_REGISTER_KEY) ?? "{}") as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, ProfileUsernameAppend] => validAppendShape(entry[1])));
  } catch {
    return {};
  }
}

function writeRegister(value: UsernameAppendRegister): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_USERNAME_APPEND_REGISTER_KEY, JSON.stringify(value));
}

export async function buildProfileUsernameAppend(args: {
  profileUserId: string;
  username: string;
  originBaseSeedHash: string;
  predecessor: ProfileUsernameAppend | null;
  kaiMicroPulse: bigint;
}): Promise<ProfileUsernameAppend> {
  const profileUserId = args.profileUserId.trim();
  const username = args.username.trim();
  const normalizedUsername = normalizeProfileUsername(username);
  const originBaseSeedHash = args.originBaseSeedHash.trim().toLowerCase();
  if (!profileUserId || !normalizedUsername || !validHex64(originBaseSeedHash)) throw new Error("username_append_invalid");
  if (args.kaiMicroPulse < 0n || (args.predecessor && args.kaiMicroPulse <= BigInt(args.predecessor.kaiMicroPulse))) {
    throw new Error("username_append_kai_order_invalid");
  }
  if (args.predecessor && (args.predecessor.profileUserId !== profileUserId || args.predecessor.originBaseSeedHash !== originBaseSeedHash)) {
    throw new Error("username_append_origin_invalid");
  }
  const unsigned = Object.freeze({
    schema: PROFILE_USERNAME_APPEND_SCHEMA,
    profileUserId,
    username,
    normalizedUsername,
    originBaseSeedHash,
    predecessorAppendHash: args.predecessor?.appendHash ?? null,
    kaiMicroPulse: args.kaiMicroPulse.toString(),
    kaiPulse: (args.kaiMicroPulse / 1_000_000n).toString(),
  });
  return Object.freeze({ ...unsigned, appendHash: await sha256Hex(jcsCanonicalize(unsigned)) });
}

export async function verifyProfileUsernameAppend(value: ProfileUsernameAppend, predecessor: ProfileUsernameAppend | null): Promise<boolean> {
  if (!validAppendShape(value)) return false;
  if (normalizeProfileUsername(value.username) !== value.normalizedUsername) return false;
  if (value.kaiPulse !== (BigInt(value.kaiMicroPulse) / 1_000_000n).toString()) return false;
  if (value.predecessorAppendHash !== (predecessor?.appendHash ?? null)) return false;
  if (predecessor && (value.profileUserId !== predecessor.profileUserId
    || value.originBaseSeedHash !== predecessor.originBaseSeedHash
    || BigInt(value.kaiMicroPulse) <= BigInt(predecessor.kaiMicroPulse))) return false;
  const { appendHash, ...unsigned } = value;
  return await sha256Hex(jcsCanonicalize(unsigned)) === appendHash;
}

export function peekProfileUsernameProof(profileUserId: string): ProfileUsernameAppend | null {
  return readRegister()[profileUserId.trim()] ?? null;
}

export async function admitProfileUsernameProofAppend(append: ProfileUsernameAppend): Promise<ProfileUsernameAppend> {
  const register = readRegister();
  const predecessor = register[append.profileUserId] ?? null;
  if (predecessor?.appendHash === append.appendHash) return predecessor;
  if (!await verifyProfileUsernameAppend(append, predecessor)) throw new Error("username_append_admission_invalid");
  register[append.profileUserId] = append;
  writeRegister(register);
  return append;
}

export async function appendProfileUsernameProof(args: {
  profileUserId: string;
  username: string;
  originBaseSeedHash: string;
  kaiMicroPulse?: bigint;
}): Promise<ProfileUsernameAppend> {
  const profileUserId = args.profileUserId.trim();
  const register = readRegister();
  const predecessor = register[profileUserId] ?? null;
  const normalizedUsername = normalizeProfileUsername(args.username);
  if (predecessor && predecessor.normalizedUsername === normalizedUsername
    && predecessor.originBaseSeedHash === args.originBaseSeedHash.trim().toLowerCase()) return predecessor;
  const sampled = args.kaiMicroPulse ?? getKaiTimeSource().nowMicroPulses();
  const kaiMicroPulse = predecessor && sampled <= BigInt(predecessor.kaiMicroPulse)
    ? BigInt(predecessor.kaiMicroPulse) + 1n
    : sampled;
  const append = await buildProfileUsernameAppend({ ...args, profileUserId, predecessor, kaiMicroPulse });
  return admitProfileUsernameProofAppend(append);
}
