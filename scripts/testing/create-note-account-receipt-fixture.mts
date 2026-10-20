/** Optional fixture regeneration against the named Receiz checkout. All accounts,
 * funding ingress, signer roots and authenticators are explicitly synthetic.
 * The native writer and proof verifiers are real. No network is permitted.
 * Normal application builds/tests need only the retained public test sources. */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
const source=resolve(process.argv[2]??''),output=resolve(process.argv[3]??'tests/fixtures/note-account-deposit');
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
assert.ok(commit.startsWith('0a4eca945'));
assert.equal(JSON.parse(await readFile(resolve(source,'packages/receiz-sdk/package.json'),'utf8')).version,'129.0.0');
const load=(name:string)=>import(pathToFileURL(resolve(source,name)).href);
const bank=await import(new URL('../../public/native/offline-notes.v129.mjs',import.meta.url).href);
assert.equal(typeof bank.prepareBankNoteAccountTransfer,'function','Bank composition must retire the sender into the receiving account proof');
const [{bankNativeWalletFixture},{createBankNativeNoteSourceStore},{createReceizIdentityKeyFile},{createKairosOfflineCashFundingAuthorization},
 {createBankFundingResume},{createBankNoteFundingService},{createBankReserveAllocationArtifact},{verifyBankReserveAllocationArtifact},
 {createKairosReservePwaCustodyAdapter,createKairosReserveMemoryPwaCustodyStorage},issuance,{verifyBankFundedNoteSource},{prepareBankNoteRedemption,readBankNoteRedemption},
 {createBankNoteRedemptionService},{createBankReserveCreditArtifact},{receizBase64UrlEncode}]=await Promise.all([
 'app/lib/wallet/__tests__/bankNativeWalletFixture.ts','app/lib/wallet/bankNotes/nativeNoteStore.server.ts','packages/receiz-sdk/src/identity.ts',
 'app/lib/wallet/kairosOfflineCashFundingAuthorization.ts','app/lib/wallet/bankNotes/fundingResume.ts','app/lib/wallet/bankNotes/fundingService.ts',
 'app/lib/wallet/bankNotes/allocation.server.ts','app/lib/wallet/bankNotes/allocation.ts','app/lib/wallet/kairosReservePwaCustodyAdapter.ts',
 'app/lib/wallet/kairosOfflineNoteLocalIssuance.ts','app/lib/wallet/bankNotes/fundedNote.ts','app/lib/wallet/bankNotes/redemption.ts',
 'app/lib/wallet/bankNotes/redemptionService.ts','app/lib/wallet/bankNotes/credit.server.ts','packages/receiz-sdk/src/identity.ts',
].map(load));
const f=await bankNativeWalletFixture({withLawfulScope:true});
try{
 const phrase='test-only-synthetic-note-fixture';await f.fund(f.sender.id,'synthetic-note-account-fixture');
 const sender=await createReceizIdentityKeyFile({passphrase:phrase,owner:{uid:f.sender.id,username:'synthetic_sender'},portableState:{schema:'receiz.account.state.v3',snapshot:{schema:'receiz.account.state.v3',account:{userId:f.sender.id},wallet:{routeSummary:{userId:f.sender.id,balancePhiMicro:'5000000',balancePhi:'5',balanceUsd:'10.00',quote:{usdPerPhiMicrocents:'200000000'},valueStates:{settledBalanceUsdCents:'1000',settledBalanceUsd:'10.00',ecosystemBalanceUsdCents:'0',ecosystemBalanceUsd:'0.00'},rollup:{totalCreditPhiMicro:'5000000',totalCreditUsdCents:'1000',totalDebitPhiMicro:'0',totalDebitUsdCents:'0',noteMintCount:0,noteClaimCount:0}}}}}});
 const receiver=await createReceizIdentityKeyFile({owner:{uid:f.receiver.id,username:'synthetic_receiver'},portableState:{schema:'receiz.account.state.v3',snapshot:{schema:'receiz.account.state.v3',account:{userId:f.receiver.id}}}});
 await f.register(f.sender.id,sender);await f.register(f.receiver.id,receiver);
 const slot=await f.issuer.slot('synthetic-funding-slot'),store=()=>createBankNativeNoteSourceStore({directory:f.directory});
 const authorization=await createKairosOfflineCashFundingAuthorization({keyFile:sender.keyFile,passphrase:phrase,accountUserId:f.sender.id,predecessorAccountPortableStateDigest:sender.keyFile.portableState.proof.digestSha256Hex,amountUsdCents:'200',qualificationDigest:slot.qualification.qualificationDigest,installationCommitment:slot.receivingCustody.installationCommitment,receivingCustodyCommitmentDigest:slot.receivingCustody.receivingCustodyCommitmentDigest});
 const service=createBankNoteFundingService({...store(),roots:f.issuer.roots,quote:()=>200000000n,kai:()=>String(14000000),preflight:async()=>{},create:(basis:unknown)=>createBankReserveAllocationArtifact(basis,{roots:f.issuer.roots,sealDocument:f.issuer.sealDocument,signFunding:f.issuer.signFunding})});
 const funded=await service.fund(f.sender.id,'https://bank.receiz.com','receiz.com',{authorization,resumeAuthorization:await createBankFundingResume(sender.keyFile,phrase,authorization.authorizationDigest),receivingCustody:slot.receivingCustody,accountProof:sender.keyFile});
 const evidence=await verifyBankReserveAllocationArtifact(funded.artifactBytes,{roots:f.issuer.roots}),at=BigInt(evidence.funding.fundedAtKai);
 const reserve=createKairosReservePwaCustodyAdapter({webAuthn:slot.webAuthn,storage:createKairosReserveMemoryPwaCustodyStorage(),attestationRoots:f.issuer.roots});
 await reserve.prepareFundingCustody({credential:slot.credential,qualification:slot.qualification,receivingCustody:slot.receivingCustody,predecessorAccountProof:sender.keyFile});
 await reserve.activateBankAllocatedReserve({evidence,privateCashSnapshot:funded.privateCashSnapshot});
 const note=await f.issuer.slot('synthetic-note-slot'),stages=issuance.createKairosOfflineNoteMemoryIssuanceStageStore();
 const {createReceizInMemoryAdmissionStore}=await load('packages/receiz-sdk/src/admissionStore.ts');
 const {default:sharp}=await load('node_modules/sharp/lib/index.js');
 const made=await issuance.issueKairosOfflineNoteLocally({preparationId:crypto.randomUUID(),accountProof:sender.keyFile,identityPassphrase:phrase,deviceIdentity:{localUid:f.sender.id,keyId:sender.keyId},accountBinding:{accountUserId:f.sender.id,receizKeyId:sender.keyId},amountPhiMicro:1000000n,amountUsdCents:200n,usdPerPhiMicrocents:200000000n,acceptedAtKai:String(at+1n),transitionNonce:'synthetic-bank-note-issue',note:{noteId:crypto.randomUUID(),noteToken:'synthetic-test-only-token',mintedAt:new Date().toISOString(),mintClientNonce:'synthetic-bank-note-issue'},noteCustody:note.adapter,reserveCustody:reserve,stageStore:stages,proofCustody:issuance.createKairosOfflineNoteMemoryProofCustodyStore(),admissionStore:createReceizInMemoryAdmissionStore(),admissionRootPublicKeys:f.issuer.roots},{sealDocument:f.issuer.sealDocument,rasterizeSvg:async(svg:string)=>new Uint8Array(await sharp(new TextEncoder().encode(svg)).resize({width:810}).png().toBuffer())});
 const stage=await stages.read(made.preparationId),source={schema:'receiz.bank.funded-note-source.v1',fundingArtifactBytes:funded.artifactBytes,fundingCustody:slot.receivingCustody,reserveConsumptions:[stage.reserveReceipt],noteArtifacts:[made.noteGenesis.artifactBytes]};
 const held=await verifyBankFundedNoteSource(source,{roots:f.issuer.roots});
 const request=await bank.createBankNoteAccountReceivingRequest({identity:receiver.keyFile,accountUserId:f.receiver.id});
 const {exportBankNoteImage}=await load('app/lib/wallet/bankNotes/noteImage.ts');
 const original=await exportBankNoteImage(held,stage.note.payloadBytes);
 const transferred=await bank.prepareBankNoteAccountTransfer({image:original,request,acceptedAtKai:String(at+2n),nonce:'synthetic-bank-account-deposit',custody:note.adapter,roots:f.issuer.roots,sealDocument:f.issuer.sealDocument,onSealedSource:async()=>{}});
 const verified=await bank.openBankNoteAccountDeposit(transferred.image,{receiverUserId:f.receiver.id,receiverKeyId:receiver.keyId,roots:f.issuer.roots});
 const bytes=verified.terminalSourceBytes;
 // No receiving slot, receiver authenticator or receiver custody is created.
 const redemption=createBankNoteRedemptionService({...store(),roots:f.issuer.roots,preflight:async()=>{},createCredit:(basis:unknown,original:Uint8Array,snapshot:Uint8Array)=>createBankReserveCreditArtifact(basis,original,snapshot,{roots:f.issuer.roots,sealDocument:f.issuer.sealDocument,signFunding:f.issuer.signFunding})});
 const [credit,replayed]=await Promise.all([redemption.redeem(f.receiver.id,bytes),redemption.redeem(f.receiver.id,bytes)]);assert.deepEqual(credit,replayed);
 assert.equal((await f.ledger().read()).fundedWallets.find((w:any)=>w.accountId===f.receiver.id).state.reserveUsdCents,'200');
 await mkdir(output,{recursive:true});await writeFile(resolve(output,'terminal.receiz.json.gz.bin'),gzipSync(bytes));
 await writeFile(resolve(output,'credit.json.gz.bin'),gzipSync(JSON.stringify({artifactBytes:receizBase64UrlEncode(credit.artifactBytes),privateCashSnapshot:receizBase64UrlEncode(credit.privateCashSnapshot)})+'\n'));
 await writeFile(resolve(output,'metadata.json'),JSON.stringify({synthetic:true,receizCommit:commit,roots:[...f.issuer.roots.values()],receiverUserId:f.receiver.id,receiverKeyId:receiver.keyId,noteId:held.noteId,amountPhiMicro:'1000000',amountUsdCents:'200',receiverCustodyCreated:false},null,2)+'\n');
 console.log('Synthetic sender retirement and duplicate-safe native credit verified without receiver custody. No production account or money used.');
}finally{await f.close();}
