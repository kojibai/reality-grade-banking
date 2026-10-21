import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { isVerifiedAccountProof, type VerifiedAccountProof } from '../receiz/account-proof';
import { formatMoney, formatUnits } from '../core/money';
import '../styles/account-proof.css';
function phiDelta(value: string) { const n = BigInt(value); return `${n > 0n ? '+' : n < 0n ? '−' : ''}${formatUnits((n < 0n ? -n : n).toString())}`; }

export function AccountProofDetails({ proof }: { proof: VerifiedAccountProof }) {
  const [page, setPage] = useState(0);
  if (!isVerifiedAccountProof(proof)) return null;
  const { account, checkpoint, transactions, components } = proof.statement;
  const start = Math.max(0, transactions.length - (page + 1) * 50), end = Math.max(0, transactions.length - page * 50);
  const visible = [...transactions.slice(start, end)].reverse();
  return <section className="account-proof-result" aria-label="Verified account source">
    <div className="account-proof-heading"><ShieldCheck size={17} /><strong>Account source verified</strong></div>
    <p className="account-proof-caption">Writer-attested identity, balances and full transaction statement through the source head shown below. Later activity is not checked by this file.</p>
    <dl className="account-proof-facts"><div><dt>Receiz ID</dt><dd>{account.receizId}</dd></div><div><dt>Reserve</dt><dd>{formatMoney(checkpoint.reserveUsdCents)}</dd></div><div><dt>Settlement</dt><dd>{formatUnits(checkpoint.settlementPhiMicro)} Φ</dd></div><div><dt>Transactions</dt><dd>{checkpoint.transactionCount.toLocaleString()}</dd></div><div><dt>Source ☤µKAI</dt><dd>{checkpoint.kaiUPulse}</dd></div></dl>
    {components && <details className="account-proof-evidence"><summary>Holdings &amp; committed value</summary><p className="account-proof-caption">These positions are separate from the spendable balances above. Asset backing is the full asset’s backing. Outstanding Note funding is value committed to Notes, including those sent to others; it does not prove current possession. Intrinsic proof value is measured at its sealed artifact head.</p>
      <dl className="account-proof-facts"><div><dt>Asset positions</dt><dd>{components.assets.length.toLocaleString()}</dd></div><div><dt>Open offers</dt><dd>{components.assetOffers.length.toLocaleString()}</dd></div><div><dt>Intrinsic proof value</dt><dd>{formatUnits(components.artifactIntrinsicPhiMicro)} Φ</dd></div><div><dt>Outstanding Note funding</dt><dd>{formatUnits(components.offlineLockedPhiMicro)} Φ</dd></div></dl>
      {components.assets.map(asset=><dl className="account-proof-facts" key={asset.assetId}><div><dt>{asset.name} · {asset.symbol}</dt><dd>{formatUnits(asset.quantityMicro)} units</dd></div><div><dt>Asset backing</dt><dd>{asset.backingRail==='reserve'?formatMoney(asset.backingUsdCents):`${formatUnits(asset.backingPhiMicro)} Φ`}</dd></div>{asset.backingComponents?.map(part=><div key={part.rail}><dt>{part.rail==='reserve'?'Reserve backing':'Settlement backing'}</dt><dd>{formatMoney(part.amountUsdCents)} at creation · {formatUnits(part.amountPhiMicro)} Φ</dd></div>)}<div><dt>Accepted source</dt><dd><code>{asset.headSourceSha256}</code></dd></div></dl>)}
      {components.lawfulValues.map(value=><dl className="account-proof-facts" key={value.membershipId}><div><dt>Admitted proof value</dt><dd>{formatUnits(value.settlementPhiMicro)} Φ</dd></div><div><dt>Source admission</dt><dd><code>{value.admissionDigest}</code></dd></div></dl>)}
    </details>}
    <details className="account-proof-evidence"><summary>Source &amp; transaction history</summary><dl className="account-proof-facts"><div><dt>Account head</dt><dd><code>{checkpoint.accountHead}</code></dd></div><div><dt>Source digest</dt><dd><code>{proof.sourceDigest}</code></dd></div><div><dt>Native writer</dt><dd>{proof.writer}</dd></div></dl>
      <ol className="account-proof-history" aria-label="Verified transaction statement">{visible.length ? visible.map(t => <li key={t.eventDigest}><strong>{t.description}</strong><span>{t.kind} · Kai {t.kaiUPulse}</span><div className="account-proof-movements"><span data-direction={BigInt(t.reserveDeltaUsdCents) < 0n ? 'down' : 'up'}>{BigInt(t.reserveDeltaUsdCents) > 0n ? '+' : ''}{formatMoney(t.reserveDeltaUsdCents)} Reserve</span><span data-direction={BigInt(t.settlementDeltaPhiMicro) < 0n ? 'down' : 'up'}>{phiDelta(t.settlementDeltaPhiMicro)} Φ Settlement</span></div><span>Transaction {t.sequence} · <code>{t.transactionId}</code></span><code>{t.eventDigest}</code></li>) : <li>No transactions at this source head.</li>}</ol>
      {transactions.length > 50 && <nav className="account-proof-history-pages" aria-label="Transaction statement pages"><button disabled={page === 0} onClick={() => setPage(v => v - 1)}>Newer</button><span>{start + 1}–{end} of {transactions.length.toLocaleString()}</span><button disabled={start === 0} onClick={() => setPage(v => v + 1)}>Older</button></nav>}
    </details>
  </section>;
}
