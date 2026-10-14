import { expect, it } from 'vitest';
import { openBankSubjectSource, heldBankSubjectSource } from '../src/receiz/bank-native-source';

it('the actual SDK rejects a JSON subject before it can become a bank actor', async () => {
  const file = new File(['{"subjectId":"bank","owner":"owner.receiz.id","verified":true}'], 'subject.json');
  await expect(openBankSubjectSource(file, {} as never)).rejects.toThrow('BANK_SUBJECT_SOURCE_NOT_ADMITTED');
});

it('a copied display coordinate cannot recover held subject source authority', () => {
  expect(() => heldBankSubjectSource({ subjectId: 'bank', artifactDigest: 'a'.repeat(64) } as never)).toThrow('BANK_SUBJECT_SOURCE_CUSTODY_REQUIRED');
});
