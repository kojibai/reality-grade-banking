import { verifyBankReserveAllocationArtifact } from "./allocation";
import { verifyBankSettlementAllocationArtifact } from "./settlementAllocation";
import { verifyReceizArtifact } from "../../../../packages/receiz-sdk/src/index";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../../packages/receiz-sdk/src/artifactVerification";
import { createReceizArtifactAdmissionEngine } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import { parseReceizPortableAssetDocument } from "../../../../packages/receiz-sdk/src/portableAsset";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
export type BankNoteRail = "reserve" | "settlement";
/** Dispatch only from the admitted native state, never a caller's rail flag. */
export async function verifyBankNoteAllocation(bytesInput: Uint8Array, options: { roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> } = {}) {
 const bytes=bytesInput.slice();
 const verified=options.roots?await verifyReceizArtifactWithCanonicalRoots(bytes,options.roots):await verifyReceizArtifact(bytes);
 const admission=await createReceizArtifactAdmissionEngine({canonicalSignatureV4RootPublicKeys:options.roots})(verified,{profile:"portable-state"});
 if("code" in admission || admission.profile!=="portable-state" || admission.verdict==="profile-denied")throw Error("BANK_ALLOCATION_SOURCE_REQUIRED");
 const document=await parseReceizPortableAssetDocument(admission.recoveredState);
 if(document.settlement.state==="bank_allocated_settlement")return verifyBankSettlementAllocationArtifact(bytes,options);
 if(document.settlement.state==="bank_allocated_reserve")return verifyBankReserveAllocationArtifact(bytes,options);
 throw Error("BANK_ALLOCATION_SOURCE_REQUIRED");
}
export const bankAllocationRail=(funding:{schema:string}):BankNoteRail=>funding.schema==="receiz.bank.settlement-allocation.v1"?"settlement":"reserve";
export const bankAllocatedPhi=(funding:{fundedSettlementPhiMicro:string}|{fundedReservePhiMicro:string})=>"fundedSettlementPhiMicro" in funding?funding.fundedSettlementPhiMicro:funding.fundedReservePhiMicro;
