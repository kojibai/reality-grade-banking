import { expect, it } from 'vitest';
import { openProofDeposit } from '../src/receiz/verification';

it('rejects an ordinary file without assigning proof ownership or spendable value', async () => { const inspection = await openProofDeposit(new File(['ordinary text'], 'notes.txt', { type: 'text/plain' })); expect(inspection.status).not.toBe('verified-artifact'); expect(inspection.canCreditValue).toBe(false); expect(inspection.canClaimOwnership).toBe(false); });
it('does not treat serialized verification claims as original proof authority', async () => { const inspection = await openProofDeposit(new File([JSON.stringify({ status: 'verified-artifact', artifactDigest: { value: 'a'.repeat(64) }, amountPhiMicro: '999999999' })], 'claimed-proof.json', { type: 'application/json' })); expect(inspection.status).not.toBe('verified-artifact'); expect(inspection.canCreditValue).toBe(false); });
