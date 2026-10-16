import { canonicalizeReceizConstitution } from "../../../../packages/receiz-sdk/src/constitution";
import { sha256ReceizBytes } from "../../../../packages/receiz-sdk/src/index";
import { isBankSettlementAllocationEvidence, type BankSettlementAllocationEvidence } from "./settlementAllocation";
export type BankSettlementAllocationCashSnapshot = Readonly<{
    schema: "receiz.bank.settlement-allocation-cash-snapshot.v1";
    allocationId: string;
    accountUserId: string;
    receizKeyId: string;
    reserveBeforeUsdCents: string;
    reserveAfterUsdCents: string;
    walletBeforePhiMicro: string;
    walletAfterPhiMicro: string;
}>;
function validate(snapshot: BankSettlementAllocationCashSnapshot): void {
    if (!snapshot || Object.keys(snapshot).sort().join("|") !== ["schema", "allocationId", "accountUserId", "receizKeyId", "reserveBeforeUsdCents", "reserveAfterUsdCents", "walletBeforePhiMicro", "walletAfterPhiMicro"].sort().join("|")
        || snapshot.schema !== "receiz.bank.settlement-allocation-cash-snapshot.v1"
        || ![snapshot.reserveBeforeUsdCents, snapshot.reserveAfterUsdCents, snapshot.walletBeforePhiMicro, snapshot.walletAfterPhiMicro].every(value => typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)))
        throw Error("BANK_CASH_SNAPSHOT_INVALID");
}
/** A private projection/opening, never a replacement for its enclosing proof. */
export function bankSettlementAllocationCashSnapshotBytes(snapshot: BankSettlementAllocationCashSnapshot): Uint8Array { validate(snapshot); return new TextEncoder().encode(canonicalizeReceizConstitution(snapshot)); }
export async function openBankSettlementAllocationCashSnapshot(allocation: BankSettlementAllocationEvidence, bytesInput: Uint8Array): Promise<BankSettlementAllocationCashSnapshot> {
    const bytes = bytesInput.slice();
    if (!isBankSettlementAllocationEvidence(allocation))
        throw Error("BANK_ALLOCATION_CUSTODY_REQUIRED");
    if (await sha256ReceizBytes(bytes) !== allocation.funding.privateAccountSnapshotSha256)
        throw Error("BANK_CASH_SNAPSHOT_BINDING_MISMATCH");
    let snapshot: BankSettlementAllocationCashSnapshot;
    try {
        snapshot = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        validate(snapshot);
    }
    catch {
        throw Error("BANK_CASH_SNAPSHOT_INVALID");
    }
    const funding = allocation.funding;
    if (snapshot.allocationId !== funding.allocationId || snapshot.accountUserId !== funding.accountUserId || snapshot.receizKeyId !== funding.receizKeyId
        || snapshot.reserveBeforeUsdCents !== snapshot.reserveAfterUsdCents
        || BigInt(snapshot.walletBeforePhiMicro) - BigInt(snapshot.walletAfterPhiMicro) !== BigInt(funding.fundedSettlementPhiMicro))
        throw Error("BANK_CASH_SNAPSHOT_BINDING_MISMATCH");
    return Object.freeze(snapshot);
}
