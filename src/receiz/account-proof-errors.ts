export function accountProofError(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : '';
  if (/WRITER_NOT_PINNED/u.test(code)) return 'This source’s writer has not been qualified in this Bankeiz build. Its account claims have not been verified.';
  if (/PUBLIC_SOURCE_UNAVAILABLE/u.test(code)) return 'The public source could not be retrieved. Choose the original proof image to verify its carried snapshot on this device.';
  if (/SOURCE_UNAVAILABLE/u.test(code)) return 'A verified public account source is not available yet. Your private backup remains separate.';
  if (/IMAGE_SOURCE_REQUIRED/u.test(code)) return 'This image does not carry the original account proof. Choose the original exported PNG; screenshots and recompressed images do not preserve its source.';
  if (/REFRESH_REQUIRED/u.test(code)) return 'Refresh the account proof before saving. This statement is outside the export freshness window.';
  if (/OWNER_MISMATCH/u.test(code)) return 'This proof belongs to a different Receiz ID. No account data was changed.';
  return 'The complete public account proof could not be verified. No file was shared and your account is unchanged.';
}
