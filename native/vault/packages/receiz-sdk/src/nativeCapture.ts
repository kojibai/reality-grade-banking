import { jcsCanonicalize, sha256Hex } from "./verifier/crypto.js";

export type ReceizNativeCaptureV1 = Readonly<{
  schema: "receiz.native_capture.v1";
  source: "camera";
  mediaKind: "photo" | "video";
  sourceSha256: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  requestedFacingMode: "user" | "environment" | null;
  captureSessionCommitment: string;
  capturedAt: string;
  kaiUpulse: string;
  ownerReceizId: string;
  coordinates: Readonly<{
    slug: string;
    code: string;
    pulse: string;
    verifyPath: string;
  }>;
  commitmentSha256: string;
}>;

export type ReceizNativeCaptureV1Input = Readonly<{
  source: string;
  mediaKind: "photo" | "video";
  sourceBytes: Uint8Array;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  requestedFacingMode: "user" | "environment" | null;
  captureSessionCommitment: string;
  capturedAt: string;
  kaiUpulse: string;
  ownerReceizId: string;
  coordinates: ReceizNativeCaptureV1["coordinates"];
}>;

export type ReceizNativeCaptureV1VerificationInput = Readonly<{
  sourceBytes: Uint8Array;
  coordinates: ReceizNativeCaptureV1["coordinates"];
}>;

type ReceizNativeCaptureCommitmentBody = Omit<ReceizNativeCaptureV1, "commitmentSha256">;

const HEX64_RE = /^[0-9a-f]{64}$/;
const NATIVE_CAPTURE_KEYS = new Set([
  "schema",
  "source",
  "mediaKind",
  "sourceSha256",
  "mimeType",
  "width",
  "height",
  "durationMs",
  "requestedFacingMode",
  "captureSessionCommitment",
  "capturedAt",
  "kaiUpulse",
  "ownerReceizId",
  "coordinates",
  "commitmentSha256",
]);
const COORDINATE_KEYS = new Set(["slug", "code", "pulse", "verifyPath"]);

function normalizeNonNegativeInteger(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function isNonNegativeIntegerOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function hasExactKeys(value: Record<string, unknown>, keys: ReadonlySet<string>): boolean {
  const valueKeys = Object.keys(value);
  return valueKeys.length === keys.size && valueKeys.every((key) => keys.has(key));
}

function hasExactCoordinates(
  value: unknown,
  expected?: ReceizNativeCaptureV1["coordinates"],
): value is ReceizNativeCaptureV1["coordinates"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const coordinates = value as Record<string, unknown>;
  const valid = hasExactKeys(coordinates, COORDINATE_KEYS)
    && isNonemptyString(coordinates.slug)
    && isNonemptyString(coordinates.code)
    && isNonemptyString(coordinates.pulse)
    && isNonemptyString(coordinates.verifyPath);
  if (!valid || !expected) return valid;
  return coordinates.slug === expected.slug
    && coordinates.code === expected.code
    && coordinates.pulse === expected.pulse
    && coordinates.verifyPath === expected.verifyPath;
}

function commitmentBody(value: ReceizNativeCaptureV1): ReceizNativeCaptureCommitmentBody {
  const { commitmentSha256: _commitmentSha256, ...body } = value;
  return body;
}

function isNativeCapture(value: unknown): value is ReceizNativeCaptureV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const capture = value as Record<string, unknown>;
  return hasExactKeys(capture, NATIVE_CAPTURE_KEYS)
    && capture.schema === "receiz.native_capture.v1"
    && capture.source === "camera"
    && (capture.mediaKind === "photo" || capture.mediaKind === "video")
    && typeof capture.sourceSha256 === "string"
    && HEX64_RE.test(capture.sourceSha256)
    && isNonemptyString(capture.mimeType)
    && isNonNegativeIntegerOrNull(capture.width)
    && isNonNegativeIntegerOrNull(capture.height)
    && isNonNegativeIntegerOrNull(capture.durationMs)
    && (capture.requestedFacingMode === "user" || capture.requestedFacingMode === "environment" || capture.requestedFacingMode === null)
    && typeof capture.captureSessionCommitment === "string"
    && HEX64_RE.test(capture.captureSessionCommitment)
    && isNonemptyString(capture.capturedAt)
    && isNonemptyString(capture.kaiUpulse)
    && isNonemptyString(capture.ownerReceizId)
    && hasExactCoordinates(capture.coordinates)
    && typeof capture.commitmentSha256 === "string"
    && HEX64_RE.test(capture.commitmentSha256);
}

export async function createReceizNativeCaptureV1(input: ReceizNativeCaptureV1Input): Promise<ReceizNativeCaptureV1> {
  if (input.source !== "camera") throw new Error("native_capture_camera_ceremony_required");

  const append: ReceizNativeCaptureV1 = {
    schema: "receiz.native_capture.v1",
    source: "camera",
    mediaKind: input.mediaKind,
    sourceSha256: await sha256Hex(input.sourceBytes),
    mimeType: input.mimeType,
    width: normalizeNonNegativeInteger(input.width),
    height: normalizeNonNegativeInteger(input.height),
    durationMs: normalizeNonNegativeInteger(input.durationMs),
    requestedFacingMode: input.requestedFacingMode,
    captureSessionCommitment: input.captureSessionCommitment,
    capturedAt: input.capturedAt,
    kaiUpulse: input.kaiUpulse,
    ownerReceizId: input.ownerReceizId,
    coordinates: {
      slug: input.coordinates.slug,
      code: input.coordinates.code,
      pulse: input.coordinates.pulse,
      verifyPath: input.coordinates.verifyPath,
    },
    commitmentSha256: "",
  };
  const commitmentSha256 = await sha256Hex(jcsCanonicalize(commitmentBody(append)));
  const verified: ReceizNativeCaptureV1 = { ...append, commitmentSha256 };

  if (!await verifyReceizNativeCaptureV1(verified, { sourceBytes: input.sourceBytes, coordinates: input.coordinates })) {
    throw new Error("native_capture_verification_failed");
  }
  return verified;
}

export async function verifyReceizNativeCaptureV1(
  value: unknown,
  expected: ReceizNativeCaptureV1VerificationInput,
): Promise<ReceizNativeCaptureV1 | null> {
  const committed = await verifyReceizNativeCaptureCommitmentV1(value, expected.coordinates);
  if (!committed) return null;
  if (await sha256Hex(expected.sourceBytes) !== committed.sourceSha256) return null;
  return committed;
}

export async function verifyReceizNativeCaptureCommitmentV1(
  value: unknown,
  coordinates: ReceizNativeCaptureV1["coordinates"],
): Promise<ReceizNativeCaptureV1 | null> {
  if (!isNativeCapture(value) || !hasExactCoordinates(value.coordinates, coordinates)) return null;
  const commitmentSha256 = await sha256Hex(jcsCanonicalize(commitmentBody(value)));
  return commitmentSha256 === value.commitmentSha256 ? value : null;
}
