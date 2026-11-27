import { useState, useSyncExternalStore } from 'react';
import { NativeOperation } from '../account/NativeOperation';
import { retainRatifiedCurrencyCharter } from '../../receiz/currency-governance';
import { governanceRows, heldGovernanceOriginal, subscribeGovernance, type GovernanceRow } from '../../receiz/governance-directory';
import { charterRatification, ofKind } from '../../receiz/governance-view';
import { verifyNativeAssetSource } from '../../receiz/native-asset';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { NativeCurrencyState } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';

export type CurrencySettingsHead = { digest: string; currency: NativeCurrencyState };

const emptyRows: readonly GovernanceRow[] = [];

export function CurrencyCharterLink({ identity, assetId, digest, inIssuance, onRefresh, onLinked }: {
  identity: OpenIdentity;
  assetId: string;
  digest: string;
  inIssuance?: boolean;
  onRefresh(): void;
  onLinked(head: CurrencySettingsHead): void;
}) {
  const rows = useSyncExternalStore(subscribeGovernance, governanceRows, () => emptyRows);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const charters = ofKind(rows, 'charter').filter(row => row.document.terms.rules.execution?.currency?.assetId === assetId);
  const choices = charters.filter(row => charterRatification(row, rows).complete);
  const choice = choices.find(row => row.digest === selected) ?? (inIssuance && choices.length === 1 ? choices[0] : undefined);

  if (!choices.length) return inIssuance && charters.length > 0
    ? <p className="body-copy">Linking opens when all named founders publish their ratification.</p>
    : null;

  return <section aria-label="Link community charter">
    {(!inIssuance || choices.length > 1) && <label>Ratified charter
      <select value={choice?.digest ?? ''} onChange={event => setSelected(event.currentTarget.value)}>
        <option value="">Choose a charter</option>
        {choices.map(row => <option key={row.digest} value={row.digest}>{row.document.terms.rules.name}</option>)}
      </select>
    </label>}
    {choice && <NativeOperation identity={identity} title="Link community charter" confirmLabel="Link charter"
      inputKey={JSON.stringify([digest, choice.digest])} onRefresh={onRefresh}
      input={async () => ({
        kind: 'manage-currency', assetDigest: digest,
        changes: await retainRatifiedCurrencyCharter(identity, choice, rows, heldGovernanceOriginal),
      })}
      onResult={async result => {
        if (result.status !== 'committed' || !('nativeAssetSource' in result)) return;
        try {
          const { receipt } = await verifyNativeAssetSource(result.nativeAssetSource);
          if (receipt.schema !== 'receiz.bank.native-asset-receipt.v1' ||
            receipt.review.request.kind !== 'manage-currency' || receipt.review.request.assetDigest !== digest ||
            receipt.assetAfter.id !== assetId || receipt.assetAfter.currency?.governanceCharterSha256 !== choice.digest) {
            throw Error('CURRENCY_CHARTER_LINK_SOURCE_MISMATCH');
          }
          const { sourceSha256, currency } = receipt.assetAfter;
          onLinked({ digest: sourceSha256, currency: { ...currency, governanceSettingsHead: sourceSha256 } });
        } catch {
          setMessage('Open the recorded transaction proof to confirm the community charter link.');
        }
      }}>
      <p className="body-copy"><strong>{choice.document.terms.rules.name}</strong> gives the community control of these settings through signed votes. Linking is permanent.</p>
    </NativeOperation>}
    {message && <p role="status">{message}</p>}
  </section>;
}
