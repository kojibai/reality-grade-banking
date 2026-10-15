import { formatMoney } from '../../core/money';

/** A denomination preview only. It contains no issued source, serial or claim authority. */
export function OfflineNotePreview({ amount }: { amount: string }) {
  const match = /^(0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/.exec(amount.trim());
  const cents = match ? BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0')) : null;
  const value = cents !== null && cents > 0n ? formatMoney(cents.toString()) : 'Your amount';
  return <figure className="offline-note-preview" aria-label={`Unissued Receiz note preview, ${value}`}>
    <svg viewBox="0 0 1619 971" role="img" aria-label={`Receiz Bank note design · ${value} · not issued`}>
      <image href="/notes/banknote-engraving.webp" width="1619" height="971" />
      <g fill="#152e43"><text x="160" y="248" className="note-brand">receiz<tspan className="note-bank"> bank</tspan></text><text x="165" y="311" className="note-overline">OFFLINE NOTE</text>
        <text x="150" y="558" fontSize={value.length > 10 ? 94 : 138} className="note-denomination">{value}</text>
        <text x="164" y="655" className="note-caption">Your value. In your hands.</text><text x="164" y="780" className="note-preview-label">PREVIEW · NOT ISSUED</text></g>
    </svg><figcaption>Note preview · value is committed only when issuance completes.</figcaption>
  </figure>;
}
