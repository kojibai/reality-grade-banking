# Collectibles: interactive visual study

A throwaway, sample-data preview. Its selected-card interaction reuses the new
visual-only CollectibleCardView component. No live integration is enabled. No
account, card ownership, listing, purchase or trade operation is submitted.
Open `/output/cards-preview/index.html` on the local preview server.

The user chose that the public card vault displays **all owned cards**. Only
listed cards have Buy; proposals refer to the exact cards offered and requested.
Assets shows a quiet Collectibles entry only for an account that holds cards.

The concept includes Signal, Sports and Wildz, a catalog with filters/search,
card front/back or record views, charts and stats, ownership provenance,
earning proofs or payment funding history, sends, sale-link sharing, the public
vault, purchase reviews, and trade offers. Values and histories are labelled
samples, not actual account observations. No live pricing is calculated here.

Visual sources: Bankeiz's existing tokens, BankMark, lucide icons and ValueChart;
Receiz's existing Signal card screenshot and Sports card reference artwork;
Wildz's existing pure card renderer, invoked with isolated design fixtures.
The front/back artwork in a real integration must come from the exact held
originals. The pale record side in this study represents the proposed disclosure
layout; it is not a newly issued or verified original.

Next implementation work must qualify each family's existing same-owner
operations and carried inventory. Reuse admitted/retained account sources and
already-prepared chart/provenance projections; no per-card discovery reads,
re-verification, eager gallery decoder or background animation is implied.
Do not assume every family's inventory is already available in the active Bank
session or that cross-family atomic swaps are supported without qualification.

Naming refinement: the Assets entry is Collectibles, the owner's catalog is
Your collection and the public catalog is Maya's collection. Card remains an
item-specific term. Taxonomy is an arbitrary-depth path carried with the sample
items, not a closed union or fixed three-category UI. Type chips and deeper
category choices derive only from items present. The current sample paths are
Sports → Baseball → Pitchers, Signal → Characters → Champions and Wildz →
Creatures → Earth; other qualifying types can supply different paths.

Selected-card handling: swipe horizontally in either direction to turn the card,
or use the existing flip button, a tap, Enter or Space. A small pointer-driven
3D tilt settles when handling stops. Vertical scrolling and pinching keep their
native behavior; canceled gestures do not turn the card. Reduced motion skips
tilt and animated turns. This component has no network calls, source decoding,
financial work, idle animation loop or gallery-wide GPU promotion.

Profile refinement: the Public profile scene shows a quiet Originals value above
its grid, calculated once from the exact sample originals already displayed.
The small upright-card icon beside Assets and Public activity opens Maya's public collection
and is omitted when the sample account holds no collectibles. Single Back
navigation replaces the redundant X and returns the collection to its entry
point. Profile amounts, originals and artwork placeholders are sample fixtures.
