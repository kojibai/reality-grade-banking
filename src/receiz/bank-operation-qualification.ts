// No qualified native financial effect verifier has been supplied yet.
// A generic portable transition proves history, not the reviewed debit,
// credit, supply or recipient. Host JSON, runtime readiness, environment flags
// and an echoed request cannot qualify this boundary. Replace this refusal
// only with the admitted effect verification in the prepared-operation
// contract; retain the refusal tests for absent/unqualified sources.
export function assertBankOperationQualified(): void {
  throw Error('BANK_OPERATION_FINANCIAL_ADAPTER_UNQUALIFIED');
}
