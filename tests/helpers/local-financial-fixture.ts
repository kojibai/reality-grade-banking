import {conformanceOfflineFixture} from './conformance-offline-sealer';
import {canonicalJson} from '../../src/conformance/assessment';
import type {LocalFinancialRuntime,LocalFinancialSessionOptions} from '../../src/receiz/local-financial';
import type {FinancialPublication} from '../../src/receiz/local-financial-runtime';
const encode=(v:Uint8Array)=>Buffer.from(v).toString('base64url');
const bytes=(v:unknown)=>new TextEncoder().encode(canonicalJson(v));
const sha=async(v:Uint8Array)=>Buffer.from(await crypto.subtle.digest('SHA-256',v.slice().buffer)).toString('hex');
const digest=(v:unknown)=>sha(bytes(v));
/** Synthetic funding/issuer and durable stores; real preferred SDK Source
 * admission, Identity consent, signatures, arithmetic and commit run unchanged. */
export async function localFinancialFixture(settings:{growth?:boolean;dynamicMarket?:boolean;quantityMarket?:string}={}){
 const f=await conformanceOfflineFixture({financial:true}),r=f.runtime;
 const identityVerification=await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png',{type:'image/png'}));
 const identityAdmission=await r.createReceizArtifactAdmissionEngine()(identityVerification,{profile:'identity',identityPassphrase:f.identity.phrase});
 const binding=await r.readReceizIdentityPublicBinding(identityAdmission);
 if(!f.ports.openPayload)throw Error('Fixture opener');
 const opened=await f.ports.openPayload({bytes:f.identity.bytes,filename:'identity.png',mimeType:'image/png'});
 const keyFile=r.identityTools.parseReceizIdentityArtifactText(new TextDecoder().decode(opened.bytes));
 const ownerReceizId=binding.artifactOwnerReceizId,accountUid='11111111-1111-4111-8111-111111111111',applicationId='rc_bank_account_test',allocationId='ab'.repeat(32),at='14000000000123';
 const enrollment=await f.store.load();if(!enrollment)throw Error('Fixture enrollment');
 const publicKeyRawB64u=enrollment.cert.subjectPublicKeyRawB64u;
 const publicGlyphs=settings.growth?[{id:'22222222-2222-4222-8222-222222222222',livePulseSeed:{kind:'sigil',claimPulse:13000000,beat:0,stepIndex:0,chakraDay:null,creatorVerified:false,kaiSignature:null,userPhiKey:null}}]:[];
 const economy=r.projectGlyphEconomy({publicGlyphs,computedPulse:14000000});
 const walletValuation={schema:'receiz.bank.offline-wallet-valuation.v1',creationSigilBenefitsEnabled:!!settings.growth,publicGlyphs,lawfulActionPhiMicro:'0',profileSeedPhiMicro:'0',profileSeedUsdCents:'0',membershipDigest:economy.membershipDigest,projectorDigest:economy.projectorDigest};
 const walletLedger={accountBalancePhiMicro:'1000000',totalCreditPhiMicro:'1000000',totalDebitPhiMicro:'0',totalCreditUsdCents:'10000',totalDebitUsdCents:'0',settledUsdCents:'10000'};
 const value=r.financialMath.compileBankOfflineWalletValuation(walletValuation,at).at(walletLedger,accountUid,at);
 const term={marketItemId:'asset:held',sourceArtifactSha256:'ef'.repeat(32),bidPriceUsdCents:'100',askPriceUsdCents:'103',referenceMidUsdCents:'101',maxSingleTradeUsdCents:'20000',buyCapacityUsdCents:'20000',backedSellLiquidityUsdCents:'5000',targetBudgetUsdCents:'1200000'};
 const positions=[{marketItemId:'asset:held',shareQuantityMicro:'3000000',costBasisUsdCents:'300',costBasisPhiMicro:'30000'}];
 const program={schema:'receiz.bank.offline-financial-program.v1',sourceFamily:'connected-wallet-share-market',applicationId,accountUserId:accountUid,ownerReceizId,nativeValueEnabled:value.nativeValueEnabled,usdPerPhiMicrocents:value.usdPerPhiMicrocents,validFromKaiUPulse:at,expiresAtKaiUPulse:'19000000000000',walletValuation,marketTerms:[term],identity:{keyId:binding.keyId,alg:binding.alg,publicKeyRawB64u:binding.publicKeyRawB64u},custodian:{kind:'existing-sdk-record-signer',publicKeyRawB64u},recipientBindings:[{recipientUserId:'33333333-3333-4333-8333-333333333333',recipientOwnerReceizId:'receiver.receiz.id',conversationId:'44444444-4444-4444-8444-444444444444',sourceAccountArtifactSha256:'ed'.repeat(32)}]};
 const initialState={schema:'receiz.account-financial-state.v1',allocationId,accountUserId:accountUid,sequence:'0',lastKaiUPulse:at,wallet:value.wallet,walletLedger,positions,marketCapacity:[{marketItemId:term.marketItemId,buyCapacityUsdCents:term.buyCapacityUsdCents,backedSellLiquidityUsdCents:term.backedSellLiquidityUsdCents}]};

 if(settings.dynamicMarket){
  const basis={schema:'receiz.bank.offline-market-pricing.v1',item:{id:term.marketItemId,pricingSourceKey:null,source:'profile',priceUsd:10,pricePhi:10,intrinsicPhi:10,quoteUsdPerPhi:1,changePct:2,volumeUsd:100,liquidityUsd:100,holders:10,livePulseSeed:{kind:'sigil',claimPulse:13000000,beat:0,stepIndex:0,chakraDay:null,creatorVerified:false,kaiSignature:null,userPhiKey:null}},livePositionQuantityMicro:'3000000',certificateQuantityMicro:'0',recentTrades:[]};
  const opening=r.financialMath.compileBankOfflineMarketPricing(basis,at).at('0',[],at);
  Object.assign(term,{bidPriceUsdCents:String(opening.bidPriceUsdCents),askPriceUsdCents:String(opening.askPriceUsdCents),referenceMidUsdCents:String(opening.referenceMidUsdCents),targetBudgetUsdCents:String(opening.pressure.targetBudgetUsdCents)});
  Object.assign(program,{schema:'receiz.bank.offline-financial-program.v2',marketPricing:[{marketItemId:term.marketItemId,basis}]});Object.assign(initialState,{marketActivity:[]});
 }
 if(settings.quantityMarket!==undefined){Object.assign(program,{schema:'receiz.bank.offline-financial-program.v3'});Object.assign(term,{buyShareQuantityMicro:settings.quantityMarket});Object.assign(initialState.marketCapacity[0]!,{buyShareQuantityMicro:settings.quantityMarket});}
 const inventory={schema:'receiz.bank.offline-financial-capture.v1',accountUserId:accountUid,walletAccount:{balancePhiMicro:'1000000',membershipRevision:'0'},rawSettledUsdCents:'10000',principalArtifactIds:publicGlyphs.map(g=>g.id),ledgerKnownKaiHead:at,ledgerExactJson:'[]',positionsExactJson:'[]',walletLedger,profileSeed:{amountPhiMicro:'0',amountUsdCents:'0'},positions};
 const identityArtifact={artifactSha256:await sha(f.identity.bytes),exactBytesB64u:encode(f.identity.bytes)};
 const funding={schema:'receiz.bank.offline-financial-allocation.v1',allocationId,applicationId,accountUserId:accountUid,ownerReceizId,receizKeyId:binding.keyId,sourceAccountArtifactSha256:identityArtifact.artifactSha256,sourceInventorySha256:await digest(inventory),executionProgramSha256:await digest(program),initialStateSha256:await digest(initialState),receivingCustodyCommitmentDigest:await digest(program.custodian),fundedAtKaiUPulse:at};
 const signOwner=(challengeText:string)=>r.identityTools.signReceizIdentityLoginProof({keyFile,passphrase:f.identity.phrase,challengeText});
 const ownerConsent=await signOwner('receiz.account-execution-consent.v1\0'+canonicalJson(funding));
 const body={funding,fundingSignature:await f.signFinancial(new TextEncoder().encode('receiz.bank.offline-reserve.v129\0'+canonicalJson(funding))),program,initialState,inventory,ownerConsent,identityArtifact};
 const document=await r.portable.createReceizPortableAssetDocument({assetType:'proof_object',payload:{mimeType:'application/json',bytes:bytes(body)},ownership:{ownerReceizId,custody:'receiz.account-execution:'+allocationId,proofRef:'genesis'},provenance:{root:'receiz.bank.offline-financial-allocation:'+allocationId,appends:[]},settlement:{state:'offline_financial_allocation'}});
 const sealer=r.offline.createReceizOfflineSealer({store:f.store,resources:f.resources,ownerIdentityAdmission:identityAdmission,fetch:async()=>{throw Error('Fixture network forbidden');}});
 const sealed=await sealer.seal({bytes:r.portable.serializeReceizPortableAssetDocument(document),filename:'source.json',mimeType:'application/json'});
 const runtime:LocalFinancialRuntime&{decode(v:string):Uint8Array}={...r.financialSource,...r.financialCommit,...r.financialExecution,...r.financialPublication,financialSourceApplicationId:source=>r.financialSource.readReceizAccountFinancialSourceCustody(source).body.funding.applicationId,financialKaiNow:()=>String(now++),financialSourceWalletAt:(source,state,at)=>({...r.financialSource.readReceizAccountFinancialSourceCustody(source).valuation.at(state.walletLedger,source.accountUserId,at).wallet}),decode:v=>new Uint8Array(Buffer.from(v,'base64url'))};
 const originals=new Map<string,Uint8Array>(),requests:FinancialPublication[]=[],listeners=new Set<()=>void>();let online=false,now=14000000000124n;
 const options:LocalFinancialSessionOptions={sourceBytes:sealed.artifactBytes,applicationId,accountUid,ownerReceizId,runtime,store:r.stores.createReceizInMemoryAdmissionStore(),originals:{retain:async(sha,b)=>{if(!originals.has(sha))originals.set(sha,b.slice());},read:async sha=>originals.get(sha)?.slice()??null},signOwner,signRecord:async b=>new Uint8Array(await crypto.subtle.sign('Ed25519',enrollment.privateKey,b.slice().buffer)),assertOpen(){},online:()=>online,subscribeReconnect:listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},publish:async batch=>{requests.push(structuredClone(batch));return{schema:'receiz.account-financial-publication-ack.v1',allocationId:batch.allocationId,sourceArtifactSha256:batch.sourceArtifactSha256,accepted:batch.originals.map(({operationId,artifactSha256,sequence})=>({operationId,artifactSha256,sequence}))};}};
 return{options,runtime,requests,originals,listeners,connect(){online=true;for(const listener of listeners)listener();},at(v:bigint){now=v;}};
}
