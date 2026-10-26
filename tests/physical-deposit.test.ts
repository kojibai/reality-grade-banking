import { expect, it } from 'vitest';
import { projectHeldDeposit } from '../src/receiz/deposit-source';
const delivery = { schema: 'receiz.bank.delivery-instructions.v1', recipient: 'Receiz', publicAlias: 'receiz', addressLines: ['1270 Ave of the Americas, 7th Fl', 'New York, NY 10020', 'United States'], reference: 'fef806e9-82bd-44a8-9bb4-f6b5afc9aef0' };
function open(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return projectHeldDeposit({ sealedArtifact: { continuity: { ownerReceizId: 'fixture.receiz.id' }, artifactSha256: 'b'.repeat(64) }, verifiedPayload: { bytes, filename: 'intake.json' }, verification: { bundle: {} } } as never, bytes, 'intake.receiz', 'fixture.receiz.id');
}
function request(category = 'physical') { return { schema: 'receiz.bank.asset-intake-request.v1', requestId: delivery.reference, asset: { title: 'Fixture asset', category, quantity: '1', estimatedValue: '' }, custody: 'awaiting-receipt', createsSpendableValue: false }; }
it('reopens the exact carried shipping instructions without promoting them to a custody receipt', () => {
  const held = open({ ...request(), delivery });
  expect((held as unknown as { delivery?: unknown }).delivery).toEqual(delivery);
  expect(held.status).toBe('awaiting-custody');
});
it('does not assign current shipping instructions to an older or nonphysical request', () => {
  expect((open(request()) as unknown as { delivery?: unknown }).delivery).toBeUndefined();
  expect((open({ ...request('stock'), delivery }) as unknown as { delivery?: unknown }).delivery).toBeUndefined();
});
it('refuses delivery instructions linked to a different request', () => {
  expect(() => open({ ...request(), delivery: { ...delivery, reference: 'b317e2da-66fc-4b74-8fce-d16a6e791007' } })).toThrow('delivery');
});

it('retains an open asset request without inventing a physical delivery or funding result',()=>{
 const held=open({...request('other'),asset:{title:'Seasonal harvest — 1,000 kg potatoes',category:'other',quantity:'1',estimatedValue:''}});
 expect(held.intake?.title).toBe('Seasonal harvest — 1,000 kg potatoes');expect(held.intake?.category).toBe('other');expect(held.delivery).toBeUndefined();expect(held.status).toBe('awaiting-custody');expect(held.nativeAsset).toBeUndefined();
});
