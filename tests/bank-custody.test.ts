import { expect, it } from 'vitest';
import { openBankCustodyReceipt, planBankCustodyReceiptIssue, applyBankCustodyReceiptIssue } from '../src/receiz/bank-custody';
it('refuses to turn an operator alias or address into receipt-issuer authority', async () => {
  await expect(openBankCustodyReceipt({ operatorPolicyDigest: '', operatorAuthority: { domainId: 'bank.receiz.com.custody' } } as never)).rejects.toThrow('CUSTODY_OPERATOR_SOURCE_REQUIRED');
});
it('a same-named issuer domain still needs the bank’s trusted policy pin before issuing a receipt', async () => {
  await expect(planBankCustodyReceiptIssue({ authority: { domainId: 'bank.receiz.com.custody', domainAuthorityArtifactSha256: 'a'.repeat(64) } } as never)).rejects.toThrow('CUSTODY_OPERATOR_SOURCE_REQUIRED');
});
it('a supplied confirmation digest cannot replace a source-bound custody receipt plan', async () => {
  await expect(applyBankCustodyReceiptIssue({ plan: { kind: 'credential', confirmationDigest: 'a'.repeat(64) }, confirmationDigest: 'a'.repeat(64) } as never)).rejects.toThrow('CUSTODY_SOURCE_PLAN_REQUIRED');
});
it('the actual SDK rejects a caller-shaped custody receipt even with supplied coordinate strings', async () => {
  const file = new File(['{"received":true,"verified":true,"owner":"fixture.receiz.id","value":50000}'], 'fake.json');
  await expect(openBankCustodyReceipt({ receipt: file, intake: file, operatorPolicyDigest: 'a'.repeat(64), operatorAuthority: { domainAuthorityArtifactSha256: 'a'.repeat(64), domainId: 'bank.receiz.com.custody' } } as never)).rejects.toThrow('CUSTODY_SOURCE_NOT_ADMITTED');
});
