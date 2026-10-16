import { BANK_PUBLIC_ORIGIN } from './config';
export function accountProofUrl(digest: string): string {
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw Error('ACCOUNT_PROOF_DIGEST_INVALID');
  return `${BANK_PUBLIC_ORIGIN}/verify/${digest}/`;
}
export function accountProofRoute(path: string): string | null {
  return path.match(/^\/verify\/([a-f0-9]{64})\/?$/u)?.[1] ?? null;
}
