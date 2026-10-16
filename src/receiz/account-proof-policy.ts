/** Public trust configuration, never a credential. Populated only after the
 * native writer supplies a qualified public source and reviewed issuer binding.
 * A source file or API response may not choose its own trusted writer. */
export const ACCOUNT_PROOF_WRITERS: readonly string[] = Object.freeze([]);
export const ACCOUNT_PROOF_PATH = '/api/connect/account-proof';
export const ACCOUNT_PROOF_MAX_BYTES = 24 * 1024 * 1024;
export const ACCOUNT_PROOF_EXPORT_AGE_PULSES = 30n;
