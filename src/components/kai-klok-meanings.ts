import type { KAI_DAYS, KAI_MONTHS, KAI_PHASES, KAI_WEEKS, KaiKlokMoment } from './kai-klok';

// Editorial interpretation, not timing, valuation or physiological evidence.
// Foundations: pinned kai_pulse.ts DAY_TO_CHAKRA / ARC_DESC / MONTHS /
// WEEK_SPIRALS, and Receiz Mind's kai-guide.js body references and week themes.
// Bankeiz applications translate that vocabulary into voluntary practices of
// stewardship, review and coordination; they confer no transaction authority.
export type KaiMeaning = { resonance: string; body: string; meaning: string; application: string };

export const KAI_DAY_MEANINGS: Record<typeof KAI_DAYS[number]['name'], KaiMeaning> = {
  Solhara: {
    resonance: 'Foundation · stability · intention', body: 'Root · pelvic foundation',
    meaning: 'Red expresses grounding and the formation of purpose. The body reference places attention at the base: the support on which deliberate action depends.',
    application: 'Establish the basis of a commitment: what is held, what is owed, and what the resources are intended to serve. A clear foundation makes later decisions easier to account for.',
  },
  Aquaris: {
    resonance: 'Connection · creativity · flow', body: 'Sacral · lower abdomen and hips',
    meaning: 'Orange represents movement, relationship and creative adaptation. Its body reference evokes the capacity to respond without losing continuity.',
    application: 'Consider how resources move between people and obligations. Coordinate expectations, surface dependencies and leave room to adapt while keeping the record of each commitment clear.',
  },
  Flamora: {
    resonance: 'Clarity · resolve · directed action', body: 'Solar Plexus · upper abdomen and core',
    meaning: 'Yellow expresses the KKS theme of embodied will: an intention made clear enough to guide action. The core is its symbolic center of resolve.',
    application: 'Bring priorities, approvals and intended outcomes into alignment. Make the purpose of a payment or allocation explicit, so the decision can be understood alongside its evidence.',
  },
  Verdari: {
    resonance: 'Balance · reciprocity · care', body: 'Heart · chest and breath',
    meaning: 'Green represents connection held in balance. The heart and breath provide a symbolic reference for reciprocity: individual responsibility within a shared relationship.',
    application: 'Review commitments from both sides. Consider the recipient, the agreed terms and the obligations that continue after a transfer. Stewardship includes the relationship as well as the amount.',
  },
  Sonari: {
    resonance: 'Truth · expression · shared understanding', body: 'Throat · voice and expression',
    meaning: 'Cyan carries the theme of resonant communication: intention expressed clearly enough to be understood by another person. The voice is its body reference.',
    application: 'Give decisions a clear record. Confirm recipients and terms, add useful payment notes, and share receipts that let the other party inspect the same evidence.',
  },
  Kaelith: {
    resonance: 'Memory · perspective · integration', body: 'Crown · whole-axis awareness',
    meaning: 'Violet represents the integration of experience into a wider perspective. Its crown reference brings the cycle back to the relationship between individual actions and the whole.',
    application: 'Review activity across the cycle, preserve what was learned and carry the context forward. Connected records make a sequence of transactions intelligible as a continuing history.',
  },
};

export const KAI_PHASE_MEANINGS: Record<typeof KAI_PHASES[number]['name'], KaiMeaning> = {
  Initialization: {
    resonance: 'Emergence · purpose · readiness', body: 'Root · grounding and foundation',
    meaning: 'The red phase expresses ignition: purpose taking a definite form. Its foundational body reference emphasizes readiness before movement.',
    application: 'Define the objective, identify the responsible parties and establish the evidence a decision needs. This gives work a clear starting basis that later review can return to.',
  },
  Integration: {
    resonance: 'Connection · receptivity · alignment', body: 'Sacral · movement and relationship',
    meaning: 'Orange expresses the integration of new information with an existing situation. Its body association is fluidity: making room for change while retaining continuity.',
    application: 'Bring instructions, resources and counterparties into a shared context. Resolve dependencies before approval, so execution reflects a coherent understanding of the commitment.',
  },
  Harmonization: {
    resonance: 'Balance · clarity · coherent action', body: 'Solar Plexus · centered resolve',
    meaning: 'Yellow represents radiance and balanced direction. The core reference connects intention with the capacity to act consistently.',
    application: 'Align the amount, recipient, purpose and authority of a decision. The practical benefit is coherence between what was intended, what was approved and what the record confirms.',
  },
  Reflection: {
    resonance: 'Reciprocity · perspective · understanding', body: 'Heart · connection and breath',
    meaning: 'Green expresses union and compassion: seeing an action in relation to the people it affects. The heart reference gives reflection a relational dimension.',
    application: 'Compare intended and recorded outcomes. Review both sides of a commitment and communicate differences with the supporting receipt, making reconciliation a shared understanding.',
  },
  Purification: {
    resonance: 'Truth · discernment · precision', body: 'Throat · truthful expression',
    meaning: 'Blue expresses clarification: separating what is established from what remains unresolved. Its voice reference connects precision with truthful communication.',
    application: 'Resolve discrepancies and distinguish instructions, pending activity and confirmed results. Preserve the original evidence so corrections remain explainable within the history.',
  },
  Synthesis: {
    resonance: 'Memory · integration · continuity', body: 'Crown · integrated awareness',
    meaning: 'Violet carries the Dream Ark themes of memory and lucid integration. Synthesis brings the experience of a cycle into a form that can inform the next.',
    application: 'Consolidate outcomes, retain receipts and carry unresolved obligations forward with their context. A completed review becomes a sound basis for the next decision.',
  },
};

export const KAI_WEEK_MEANINGS: Record<typeof KAI_WEEKS[number]['name'], KaiMeaning> = {
  'Awakening Flame': {
    resonance: 'Emergence · foundation · action', body: 'Root · foundation and support',
    meaning: 'Crimson represents the establishment of purpose. The opening week gives the month a foundational theme: intent becoming a commitment that can be carried forward.',
    application: 'Set priorities and establish the resources, obligations and responsibilities behind them. This creates a consistent basis for reviewing progress through the month.',
  },
  'Flowing Heart': {
    resonance: 'Connection · adaptability · exchange', body: 'Sacral · movement and relationship',
    meaning: 'Amber expresses connection and creative flow. Its somatic reference emphasizes responsiveness within relationships rather than isolated action.',
    application: 'Coordinate with counterparties, review dependencies and bring new information into the plan. Clear agreements help resources move with their purpose and context intact.',
  },
  'Radiant Will': {
    resonance: 'Clarity · alignment · resolve', body: 'Solar Plexus · core and directed will',
    meaning: 'Gold represents confidence grounded in an understood purpose. The core association gives this week its theme of deliberate, aligned action.',
    application: 'Review whether decisions and approvals still serve the agreed priorities. Make responsibility and intended outcomes explicit before committing to the next stage of work.',
  },
  'Harmonic Voice': {
    resonance: 'Truth · communication · resonance', body: 'Throat · voice and expression',
    meaning: 'Sapphire blue represents truth expressed with coherence. The voice reference connects individual intention with a meaning that can be shared and examined.',
    application: 'Communicate decisions, confirm terms and preserve useful explanations alongside receipts. Shared evidence gives teams and counterparties a common basis for accountability.',
  },
  'Inner Mirror': {
    resonance: 'Reflection · patterns · discernment', body: 'Third Eye · attention and perspective',
    meaning: 'Indigo expresses reflective insight: recognizing patterns within experience. Its symbolic body reference centers on attention and the ability to reconsider an interpretation.',
    application: 'Examine recurring activity, compare expectations with confirmed outcomes and investigate discrepancies. Review the underlying sources before drawing conclusions from a pattern.',
  },
  'Dreamfire Memory': {
    resonance: 'Memory · vision · possibility', body: 'Soul Star · symbolic awareness beyond the body',
    meaning: 'Violet and silver join the themes of retained experience and imagination. This week represents the connection between what has been learned and what might be built next.',
    application: 'Preserve insights from the record and use them to explore future plans. Keep established outcomes distinct from proposals, so imagination adds direction without rewriting history.',
  },
  'Krowned Light': {
    resonance: 'Completion · integration · sovereignty', body: 'Crown · whole-axis integration',
    meaning: 'The white-gold prism represents the cycle brought together. Its crown association expresses an integrated view in which individual experiences remain part of a coherent whole.',
    application: 'Close the review period, reconcile outstanding commitments and carry their exact context into the next month. Integration preserves both accountability and continuity.',
  },
};

export const KAI_MONTH_MEANINGS: Record<typeof KAI_MONTHS[number]['name'], KaiMeaning> = {
  Aethon: {
    resonance: 'Renewal · foundation · purpose', body: 'Root · pelvic foundation',
    meaning: 'Crimson expresses the KKS theme of root awakening: purpose returning to form. The foundational body reference makes this a symbol of renewal with a definite basis.',
    application: 'Establish the priorities and commitments that will shape the year. Record the starting position clearly, giving future reviews a stable point of comparison.',
  },
  Virelai: {
    resonance: 'Emergence · connection · adaptability', body: 'Sacral · lower abdomen and movement',
    meaning: 'Orange-gold represents becoming: a developing intention finding expression through relationship and flow. Its body reference evokes receptivity and creative movement.',
    application: 'Develop relationships, coordinate resources and refine plans as circumstances become clearer. Preserve the reasoning behind changes so adaptation remains accountable.',
  },
  Solari: {
    resonance: 'Clarity · embodiment · directed will', body: 'Solar Plexus · upper abdomen and core',
    meaning: 'Golden yellow expresses radiant embodiment: purpose made visible through action. Its core reference gives the month a theme of clarity and sustained resolve.',
    application: 'Connect stated objectives with the commitments that support them. Review progress against the recorded intention and make the basis of consequential decisions explicit.',
  },
  Amarin: {
    resonance: 'Balance · care · reciprocity', body: 'Heart · chest and breath',
    meaning: 'Emerald represents heart-centered balance. Its body reference places connection and reciprocity at the center of the relationship between individual and shared responsibilities.',
    application: 'Review how commitments affect the people who depend on them. Reconcile mutual obligations and maintain the context that makes an exchange fair and understandable to both parties.',
  },
  Kaelus: {
    resonance: 'Expression · coherence · shared meaning', body: 'Throat · voice and expression',
    meaning: 'Sky blue carries the native KKS theme of resonant expression. The voice reference connects a clear internal purpose with communication that others can understand.',
    application: 'Make plans and outcomes legible to counterparties and collaborators. Clear terms, connected receipts and inspectable sources turn reporting into a common basis for review.',
  },
  Umbriel: {
    resonance: 'Remembrance · discernment · alignment', body: 'Cranial focus · attention and perspective',
    meaning: 'Indigo-violet expresses remembrance and inward examination. Its attention reference gives the month a reflective character: revisiting experience to understand what remains unresolved.',
    application: 'Examine assumptions, recurring discrepancies and obligations carried from earlier periods. Use the retained evidence to resolve differences and preserve the reasons for a correction.',
  },
  Noktura: {
    resonance: 'Restoration · memory · continuity', body: 'Neural integration · rest and restoration',
    meaning: 'Lunar platinum represents the light-spiral theme of continuity through reflection. The restorative body reference offers a symbolic counterpoint to continuous outward activity.',
    application: 'Consolidate records and review the durability of the arrangements already in place. Retain the evidence and lessons needed for continuity beyond the present cycle.',
  },
  Liora: {
    resonance: 'Wholeness · integration · renewal', body: 'Crown · whole-axis coordination',
    meaning: 'The aurora prism brings the calendar’s color identities into a unified field. The eternal-mirror theme represents a complete view in which each part remains connected to its origin.',
    application: 'Bring the year’s activity into a coherent review. Reconcile outcomes, retain unresolved commitments and carry their source context into the next year without losing the history.',
  },
};

const conjunction = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' });
const resonancePhrase = (meaning: KaiMeaning) => conjunction.format(meaning.resonance.toLowerCase().split(' · '));
const phaseReadings: Record<KaiKlokMoment['phase'], { lead: string; application: string }> = {
  Initialization: { lead: 'Begin with a clear purpose.', application: 'Establish what is available, who is responsible and what the commitment is meant to achieve. Give the next action a clear starting point.' },
  Integration: { lead: 'Bring the pieces together.', application: 'Make sure the people, resources and agreed terms fit together before approval. A shared understanding gives the next action a clear purpose.' },
  Harmonization: { lead: 'Let intention and action agree.', application: 'Check that the amount, recipient and purpose match what was agreed. Keep the decision and its supporting record connected.' },
  Reflection: { lead: 'Consider the whole exchange.', application: 'Look at what was intended and what actually happened, from both sides. Use the receipt to resolve differences with a shared record.' },
  Purification: { lead: 'Make the record clear.', application: 'Separate what was requested, what is still pending and what is confirmed. Resolve differences from the original evidence, keeping the history intact.' },
  Synthesis: { lead: 'Carry the understanding forward.', application: 'Bring the outcomes together, retain the receipts and preserve the context of anything unfinished. Let what was learned inform the next commitment.' },
};

/** Interpretation of the displayed categories; no new pulse authority or prediction. */
export function describeKaiMoment(phase: KaiKlokMoment['phase'], day: KaiKlokMoment['weekday'], week: KaiKlokMoment['weekName'], month: KaiKlokMoment['monthName']) {
  const immediate = KAI_PHASE_MEANINGS[phase], daily = KAI_DAY_MEANINGS[day];
  return {
    lead: phaseReadings[phase].lead,
    character: `${phase} is about ${resonancePhrase(immediate)}. ${day} brings ${resonancePhrase(daily)} to the day. The ${week} week adds ${resonancePhrase(KAI_WEEK_MEANINGS[week])}. In ${month}, the wider focus is ${resonancePhrase(KAI_MONTH_MEANINGS[month])}.`,
    application: phaseReadings[phase].application,
    body: daily.body,
  };
}
