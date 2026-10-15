import { canonicalizeReceizConstitution } from "../../../../packages/receiz-sdk/src/constitution";
import { sha256ReceizBytes } from "../../../../packages/receiz-sdk/src/index";
import { isBankReserveAllocationEvidence, type BankReserveAllocationEvidence } from "./allocation";
export type BankAllocationCashSnapshot = Readonly<{
    schema: "receiz.bank.allocation-cash-snapshot.v1";
    allocationId: string;
    accountUserId: string;
    receizKeyId: string;
    reserveBeforeUsdCents: string;
    reserveAfterUsdCents: string;
    walletBeforePhiMicro: string;
    walletAfterPhiMicro: string;
}>;
function validate(snapshot: BankAllocationCashSnapshot): void {
    if (!snapshot || Object.keys(snapshot).sort().join("|") !== ["schema", "allocationId", "accountUserId", "receizKeyId", "reserveBeforeUsdCents", "reserveAfterUsdCents", "walletBeforePhiMicro", "walletAfterPhiMicro"].sort().join("|")
        || snapshot.schema !== "receiz.bank.allocation-cash-snapshot.v1"
        || ![snapshot.reserveBeforeUsdCents, snapshot.reserveAfterUsdCents, snapshot.walletBeforePhiMicro, snapshot.walletAfterPhiMicro].every(value => typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)))
        throw Error("BANK_CASH_SNAPSHOT_INVALID");
}
/** A private projection/opening, never a replacement for its enclosing proof. */
export function bankAllocationCashSnapshotBytes(snapshot: BankAllocationCashSnapshot): Uint8Array { validate(snapshot); return new TextEncoder().encode(canonicalizeReceizConstitution(snapshot)); }
export async function openBankAllocationCashSnapshot(allocation: BankReserveAllocationEvidence, bytes: Uint8Array): Promise<BankAllocationCashSnapshot> {
    if (!isBankReserveAllocationEvidence(allocation))
        throw Error("BANK_ALLOCATION_CUSTODY_REQUIRED");
    if (await sha256ReceizBytes(bytes) !== allocation.funding.privateAccountSnapshotSha256)
        throw Error("BANK_CASH_SNAPSHOT_BINDING_MISMATCH");
    let snapshot: BankAllocationCashSnapshot;
    try {
        snapshot = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        validate(snapshot);
    }
    catch {
        throw Error("BANK_CASH_SNAPSHOT_INVALID");
    }
    const funding = allocation.funding;
    if (snapshot.allocationId !== funding.allocationId || snapshot.accountUserId !== funding.accountUserId || snapshot.receizKeyId !== funding.receizKeyId
        || BigInt(snapshot.reserveBeforeUsdCents) - BigInt(snapshot.reserveAfterUsdCents) !== BigInt(funding.amountUsdCents)
        || BigInt(snapshot.walletBeforePhiMicro) - BigInt(snapshot.walletAfterPhiMicro) !== BigInt(funding.fundedReservePhiMicro))
        throw Error("BANK_CASH_SNAPSHOT_BINDING_MISMATCH");
    return Object.freeze(snapshot);
}
