import type { BankExecutionStore } from './bank-execution';
import { loadBankOperation, saveBankOperation } from './identity-vault';
export function deviceBankExecutionStore(binding: { artifactSha256: string }): BankExecutionStore {
  return { load: () => loadBankOperation(binding), saveNew: value => saveBankOperation(binding, value, 'new'), replace: value => saveBankOperation(binding, value, 'replace') };
}
