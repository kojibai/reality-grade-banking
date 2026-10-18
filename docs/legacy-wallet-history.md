# Retained legacy wallet chart observations

An SDK-admitted, complete, same-owner Identity snapshot may contain earlier raw
wallet entries without native Reserve/Settlement rail tags. These entries stay
separate from native financial movements. `projectLegacyWalletObservation` is a
private display fallback beneath the existing canonical Identity projection.
It never changes the wallet, funds, balances, ownership, or source authority.

The reader requires the original complete carrier and bound account; unique row
IDs and exact Kai coordinates; the original timestamp/ID ordering; every
`balance_after_phi_micro` reconciled from the complete credit/debit prefix; and
matching account, rollup, credit/debit totals and final balance. Unsafe numeric
precision, future entries, an incomplete prefix or conflicting endpoint refuses
this fallback. Earlier activity dates do not become invented zero balances.

The existing Receiz legacy wallet Reserve read rule is preserved: exact explicit
settled slices precede qualified funding sources, and every debit consumes and
clamps that accumulator. It is a read projection, separate from native Reserve
funding admission. The raw fixed-dollar accumulator is retained between events;
its displayed slice is clamped to the gross dollar observation without losing
that accumulator when a quote changes.

Historical USD samples apply the already published deterministic v129 price law
to each recorded gross-Phi balance at its exact Kai coordinate. They are labeled
`legacy-model-v129`, separate from recorded historical USD quotes or a history
of owned-artifact wealth. The last gross Phi, Reserve, Settlement and total must
all reconcile with the carried current wallet and its quote before the result
can enrich the existing dollar chart. Otherwise the wallet is preserved and the
fallback returns no dollar series.

The chart starts at the first reconciled balance observation. Each range gets a
bounded grid within its actual available history; real observations retain
priority over calculated display samples. The private cache preserves the
legacy basis and its real beginning. It omits native `settlementPhiMicro`, so
the native holdings-extension reducer cannot reinterpret this gross-Phi history
as Settlement holdings. A later complete source may enrich the same chart.

No database read is added. This uses fields already carried by an Identity Seal;
recovered private observations outside that seal still need their proper source
producer/retention path. Full earlier artifact membership, ownership, visibility
and valuation history remains a distinct source recovery requirement. The
private recovery directory is not part of this repository or public release.
