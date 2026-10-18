import type { OpenIdentity } from './native-identity';
import { loadPrivateHistoryCache, type PrivateHistoryCache } from './identity-vault';

type Restored = { value: PrivateHistoryCache | null; loaded: boolean; revision: number; pending: Promise<PrivateHistoryCache | null> };
// Identity object custody and the exact connected UID both scope every entry.
// This module has no runtime dependency on identity admission or React hooks.
const restored = new WeakMap<OpenIdentity, Map<string, Restored>>();
function entries(identity: OpenIdentity) {
  let values = restored.get(identity);
  if (!values) { values = new Map(); restored.set(identity, values); }
  return values;
}
export function peekPrivateHistory(identity: OpenIdentity | null, accountUid: string | undefined): PrivateHistoryCache | null {
  return identity && accountUid ? restored.get(identity)?.get(accountUid)?.value ?? null : null;
}
export function preloadPrivateHistory(identity: OpenIdentity, accountUid: string): Promise<PrivateHistoryCache | null> {
  const values = entries(identity), previous = values.get(accountUid);
  if (previous) return previous.loaded ? Promise.resolve(previous.value) : previous.pending;
  const entry: Restored = { value: null, loaded: false, revision: 0, pending: Promise.resolve(null) };
  values.set(accountUid, entry);
  const revision = entry.revision;
  entry.pending = Promise.resolve().then(() => loadPrivateHistoryCache(identity.binding, accountUid)).then(value => {
    if (entry.revision === revision) entry.value = value?.accountUid === accountUid ? value : null;
    entry.loaded = true; return entry.value;
  }).catch(() => { entry.loaded = true; return entry.value; });
  return entry.pending;
}
/** Only already parsed account reads or the exact vault-retained union enter
 * this display cache. A late initial restore cannot erase newer verified rows. */
export function updatePrivateHistory(identity: OpenIdentity, accountUid: string, value: PrivateHistoryCache): boolean {
  if (value.schema !== 'bank.private-history-cache.v1' || value.accountUid !== accountUid) return false;
  const values = entries(identity), entry = values.get(accountUid);
  if (entry) { entry.revision++; entry.value = value; entry.loaded = true; }
  else values.set(accountUid, { value, loaded: true, revision: 1, pending: Promise.resolve(value) });
  return true;
}
