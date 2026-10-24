import {expect,it} from 'vitest';
import * as sdk from '@receiz/sdk';
import {createVaultMoney,createVaultMoneyNative,emptyVaultMoney,admitVaultMoneyState,type VaultMoneyNative,type VaultMoneyState} from '../src/receiz/vault/money';
import {vaultCanonical,vaultDigest} from '../src/receiz/vault/encoding';

const encode=(v:unknown)=>new TextEncoder().encode(vaultCanonical(v));
const decode=(b:Uint8Array)=>JSON.parse(new TextDecoder().decode(b));
// Workflow tests. Native financial acceptance is separately exercised against
// the actual durable writer in Receiz bankVault/__tests__/money.test.ts.
function fixture(){
 let state:VaultMoneyState=emptyVaultMoney('vault','owner','child'),backups=0,approvals=0,lose=false,refuse=false,capacity=true;
 const blobs=new Map<string,Uint8Array>(),accepted=new Map<string,Uint8Array>();let issues=0,claims=0,sends=0;
 const native:VaultMoneyNative={
  async preflightTransfer(intent,originals){const notes=await Promise.all(originals.map(bytes=>this.inspectNote(bytes))),available=notes.filter(n=>n.rail===intent.rail).reduce((sum,n)=>sum+BigInt(n.amountUsdCents),0n);if(BigInt(intent.amountUsdCents)>available)throw Error('BANK_NOTE_INSUFFICIENT_FUNDS');},
  reserve:async(_kind,request)=>({schema:'receiz.bank.vault-money-capacity.v1',requestSha256:await vaultDigest(request),currentNativeHead:null,outcomeMaxBytes:1024,reservedSourceBytes:4096}),
  remainder:async()=>null,inspectRemainder:async()=>{throw Error('no native residue in this fixture');},
  inspectNote:async b=>{const v=decode(b);if(v.type!=='note')throw Error('native source invalid');return{noteId:v.id,rail:'reserve',amountUsdCents:v.cents,amountPhiMicro:v.cents};},
  prepare:async(kind,intent,originals)=>{
   if(kind==='change-reserve'){const transfer=decode(originals.at(-1)!);if(transfer.change==='0')return null;return encode({kind,id:intent.id+'-change',cents:transfer.change});}
   if(kind==='change-settlement')return null;
   if(kind==='claim-child')return encode({kind,id:decode(originals[0]).id,cents:decode(originals[0]).cents});
   return encode({kind,id:intent.id,cents:intent.amountUsdCents,recipient:intent.recipient??null});
  },
  execute:async(kind,request,recoverFirst)=>{const r=decode(request),key=kind+':'+r.id,old=accepted.get(key);if(old)return old.slice();if(recoverFirst&&refuse)throw Error('recovery unavailable');
   let result:Uint8Array;if(kind==='issue-owner'||kind==='change-reserve'){issues++;result=encode({type:'note',id:r.id,cents:r.cents});}else if(kind==='claim-child'){claims++;result=encode({type:'credit',id:r.id,cents:r.cents});}else{sends++;result=encode({type:'transfer',id:r.id,cents:r.cents,recipient:r.recipient,change:String(500n-BigInt(r.cents))});}
   accepted.set(key,result);if(lose){lose=false;throw Error('reply lost');}return result.slice();
  },
  admit:async(kind,request,result)=>{const r=decode(request),v=decode(result);if(v.id!==r.id||v.cents!==r.cents||kind==='transfer'&&v.recipient!==r.recipient)throw Error('native result substituted');},
 };
 const ports={vaultId:'vault',ownerKeyId:'owner',childKeyId:'child',ownerRecipient:'owner.receiz.id',assertOpen(){},assertCapacity:async(bytes:number)=>{expect(bytes).toBe(4096);if(!capacity)throw Error('VAULT_ORIGINAL_CAPACITY');},lock:async<T>(fn:()=>Promise<T>)=>fn(),read:async()=>structuredClone(state),write:async(next:VaultMoneyState,previous:VaultMoneyState)=>{if(vaultCanonical(previous)!==vaultCanonical(state))throw Error('CAS');state=structuredClone(next);},retain:async(b:Uint8Array)=>{const ref=await vaultDigest(b);blobs.set(ref,b.slice());return ref;},restore:async(ref:string)=>{const b=blobs.get(ref);if(!b)throw Error('missing private original');return b.slice();},backupAndReopen:async(expected:VaultMoneyState)=>{backups++;if(refuse)throw Error('save failed');return structuredClone(expected);},approve:async()=>{approvals++;},native};
 return{ports,runtime:()=>createVaultMoney(ports),state:()=>structuredClone(state),restore:(s:VaultMoneyState)=>{state=structuredClone(s);},lose:()=>{lose=true;},refuse:(v:boolean)=>{refuse=v;},capacity:(v:boolean)=>{capacity=v;},counts:()=>({issues,claims,sends,backups,approvals}),blobs};
}
it('retains, saves and reopens each prepared money request before any financial submission',async()=>{
 const f=fixture();f.refuse(true);await expect(f.runtime().add({id:'deposit-one',amountUsdCents:'500'})).rejects.toThrow('save failed');expect(f.counts().issues).toBe(0);
 f.refuse(false);await f.runtime().add({id:'deposit-one',amountUsdCents:'500'});expect((await f.runtime().holdings())[0].amountUsdCents).toBe('500');expect(f.counts().issues).toBe(1);
});
it('refuses insufficient complete-source capacity before funding and rechecks it before exact recovery',async()=>{
 const f=fixture();f.capacity(false);await expect(f.runtime().add({id:'capacity-deposit',amountUsdCents:'500'})).rejects.toThrow('CAPACITY');expect(f.counts().issues).toBe(0);
 f.capacity(true);f.lose();await expect(f.runtime().resume()).rejects.toThrow('reply lost');expect(f.counts().issues).toBe(1);const request=f.state().operations[0].stages[0].requestRef;
 f.capacity(false);await expect(f.runtime().resume()).rejects.toThrow('CAPACITY');expect(f.counts().issues).toBe(1);expect(f.state().operations[0].stages[0].requestRef).toBe(request);
 f.capacity(true);await f.runtime().resume();expect(f.counts().issues).toBe(1);expect((await f.runtime().holdings())[0].amountUsdCents).toBe('500');
});
it('a cancelled review leaves no operation that blocks a new exact amount',async()=>{
 const f=fixture(),approve=f.ports.approve;f.ports.approve=async()=>{throw Error('review cancelled');};await expect(f.runtime().add({id:'cancelled-deposit',amountUsdCents:'500'})).rejects.toThrow('review cancelled');expect(f.state().operations).toHaveLength(0);expect(f.counts().issues).toBe(0);
 f.ports.approve=approve;await f.runtime().add({id:'different-deposit',amountUsdCents:'400'});expect(f.counts().issues).toBe(1);expect((await f.runtime().holdings())[0].amountUsdCents).toBe('400');
});
it('recovers a lost accepted funding reply using the original signed request without another allocation',async()=>{
 const f=fixture();f.lose();await expect(f.runtime().add({id:'deposit-one',amountUsdCents:'500'})).rejects.toThrow('reply lost');const before=f.state();
 await f.runtime().resume();expect(f.counts().issues).toBe(1);expect(f.state().operations[0].stages[0].requestRef).toBe(before.operations[0].stages[0].requestRef);expect(await f.runtime().holdings()).toHaveLength(1);
});
it('returns a partial amount to the exact owner and retains native credit, transfer and change originals',async()=>{
 const f=fixture();await f.runtime().add({id:'deposit-one',amountUsdCents:'500'});await f.runtime().returnToOwner({id:'return-one',amountUsdCents:'200',rail:'reserve'});
 expect(f.counts()).toMatchObject({claims:1,sends:1,issues:2});expect(await f.runtime().holdings()).toMatchObject([{amountUsdCents:'300'}]);
 const op=f.state().operations[1];expect(op.intent.recipient).toBe('owner.receiz.id');expect(op.stages.filter(v=>v.outcomeRef)).toHaveLength(3);expect(op.complete).toBe(true);
});
it('refuses a changed recipient or amount when recovering a prepared send',async()=>{
 const f=fixture();await f.runtime().add({id:'deposit-one',amountUsdCents:'500'});f.refuse(true);await expect(f.runtime().send({id:'send-one',amountUsdCents:'200',rail:'reserve',recipient:'one.receiz.id'})).rejects.toThrow('save failed');f.refuse(false);
 await expect(f.runtime().send({id:'send-one',amountUsdCents:'201',rail:'reserve',recipient:'one.receiz.id'})).rejects.toThrow('VAULT_MONEY_EXACT_RESUME_REQUIRED');
 await expect(f.runtime().send({id:'send-one',amountUsdCents:'200',rail:'reserve',recipient:'two.receiz.id'})).rejects.toThrow('VAULT_MONEY_EXACT_RESUME_REQUIRED');expect(f.counts().sends).toBe(0);
});
it('re-admits the exact complete retained originals and refuses missing or substituted source bytes',async()=>{
 const f=fixture();await f.runtime().add({id:'deposit-one',amountUsdCents:'500'});const ref=f.state().notes[0];f.blobs.set(ref,encode({type:'note',id:'forged',cents:'999'}));await expect(f.runtime().holdings()).rejects.toThrow('VAULT_MONEY_SOURCE_REQUIRED');
});
it('independent admission checks consumed source continuity and every historical native original',async()=>{
 const f=fixture();await f.runtime().add({id:'deposit-one',amountUsdCents:'500'});await f.runtime().returnToOwner({id:'return-one',amountUsdCents:'200',rail:'reserve'});
 expect(await admitVaultMoneyState(f.state(),f.ports.restore,f.ports.native)).toEqual(f.state());
 const altered=f.state();altered.operations[1].inputNotes=[];await expect(admitVaultMoneyState(altered,f.ports.restore,f.ports.native)).rejects.toThrow('VAULT_MONEY_CONSUMED_SOURCE_CONTINUITY_INVALID');
 const ref=f.state().operations[1].stages[0].outcomeRef!;f.blobs.delete(ref);await expect(admitVaultMoneyState(f.state(),f.ports.restore,f.ports.native)).rejects.toThrow('missing private original');
});

it('wrong-rail or oversized sends refuse before approval, persisted operation or any Note claim',async()=>{
 for(const request of [{id:'wrong-rail-send',rail:'settlement' as const,amountUsdCents:'20'},{id:'oversized-rail-send',rail:'reserve' as const,amountUsdCents:'501'}]){const f=fixture();await f.runtime().add({id:'source-deposit',amountUsdCents:'500'});const before=f.state(),counts=f.counts();await expect(f.runtime().send({...request,recipient:'receiver.receiz.id'})).rejects.toThrow('INSUFFICIENT');expect(f.state()).toEqual(before);expect(f.counts()).toEqual(counts);await f.runtime().returnToOwner({id:'valid-after-refusal',amountUsdCents:'200',rail:'reserve'});expect(f.state().operations.at(-1)?.complete).toBe(true);}
});

it('a post-claim native preparation failure preserves exact credits pending and cold resume never replaces the approved intent',async()=>{
 const f=fixture();await f.runtime().add({id:'source-before-rate-change',amountUsdCents:'500'});const prepare=f.ports.native.prepare;let reject=true;f.ports.native.prepare=async(kind,intent,originals)=>{if(kind==='transfer'&&reject)throw Error('NATIVE_CURRENT_RATE_CHANGED');return prepare(kind,intent,originals);};
 await expect(f.runtime().send({id:'rate-sensitive-exact-send',amountUsdCents:'200',rail:'reserve',recipient:'receiver.receiz.id'})).rejects.toThrow('RATE_CHANGED');const saved=f.state(),op=saved.operations.at(-1)!;expect(op.complete).toBe(false);expect(op.result).toBeNull();expect(op.stages).toHaveLength(1);expect(op.stages[0].phase).toBe('accepted');expect(f.blobs.has(op.stages[0].outcomeRef!)).toBe(true);expect(f.counts()).toMatchObject({claims:1,sends:0});expect(await admitVaultMoneyState(saved,f.ports.restore,f.ports.native)).toEqual(saved);
 await expect(f.runtime().send({id:'different-after-rate-change',amountUsdCents:'100',rail:'reserve',recipient:'other.receiz.id'})).rejects.toThrow('OPERATION_PENDING');expect(f.state()).toEqual(saved);reject=false;await f.runtime().resume();expect(f.counts()).toMatchObject({claims:1,sends:1});expect(f.state().operations.at(-1)!.intent).toEqual(op.intent);expect(f.state().operations.at(-1)!.complete).toBe(true);
});

it('production preflight uses exact composite source parts and a current quote only for available Settlement',async()=>{
 // This is a source-admission port projection fixture; real native financial
 // signatures/writer acceptance are separately qualified by the Receiz test.
 const child=await sdk.createReceizIdentityKeyFile({owner:{uid:'child'}}),note=await sdk.createReceizIdentityKeyFile({owner:{uid:'note'}});let reads=0,rate='1000000000000';
 const funding={noteId:'composite-source',rail:'composite',amountUsdCents:'300',amountPhiMicro:'300',fundingParts:{reserve:{amountUsdCents:'100',amountPhiMicro:'100'},settlement:{amountUsdCents:'200',amountPhiMicro:'200'}},noteAuthority:{keyId:note.keyId},accountUserId:'owner'};
 const original=encode({schema:'bank.vault.money-note.v1',fundingSource:Buffer.from(encode(funding)).toString('base64url'),privateOpening:Buffer.from(encode({retained:true})).toString('base64url'),noteIdentity:sdk.serializeReceizIdentityArtifact(note.keyFile)});
 const native=createVaultMoneyNative({applicationId:'rc_preflight',vaultId:'vault',ownerUserId:'owner',owner:async()=>{throw Error('ordinary owner context forbidden');},child:async()=>({userId:'child',receizId:'owner.receiz.id',identity:child.keyFile,passphrase:'',request:async(path,options)=>{if(!path.includes('intent=quote')||options.method!=='GET')throw Error('financial request forbidden');reads++;const now=Date.now();return{ok:true,quote:{quotePulse:'14000000',issuedAtMs:now,expiresAtMs:now+300000,usdPerPhiMicrocents:rate}};}}),module:async()=>({verifyBankConnectedNoteFunding:async(bytes:Uint8Array)=>{const f=decode(bytes);return{...f,funding:f};}} as never),sdk,assertOpen(){},origin:'https://bank.test',transferSource:async()=>{throw Error('financial source export forbidden');}});
 const intent={id:'exact-preflight-send',kind:'send' as const,amountUsdCents:'100',rail:'reserve' as const,recipient:'receiver.receiz.id'};
 await native.preflightTransfer(intent,[original]);expect(reads).toBe(0);await expect(native.preflightTransfer({...intent,amountUsdCents:'101'},[original])).rejects.toThrow('INSUFFICIENT_RESERVE');expect(reads).toBe(0);
 await native.preflightTransfer({...intent,rail:'settlement',amountUsdCents:'200'},[original]);expect(reads).toBe(1);await expect(native.preflightTransfer({...intent,rail:'settlement',amountUsdCents:'201'},[original])).rejects.toThrow('INSUFFICIENT');expect(reads).toBe(2);
 rate='500000000000';await expect(native.preflightTransfer({...intent,rail:'settlement',amountUsdCents:'200'},[original])).rejects.toThrow('INSUFFICIENT');expect(reads).toBe(3);expect(decode(original).fundingSource).toBe(Buffer.from(encode(funding)).toString('base64url'));
});

it('changed preflight terms never block exact accepted-claim source recovery after a lost reply',async()=>{
 const f=fixture();await f.runtime().add({id:'source-before-lost-claim',amountUsdCents:'500'});const prepare=f.ports.native.prepare;f.ports.native.prepare=async(kind,intent,originals)=>{if(kind==='transfer')throw Error('NATIVE_CURRENT_RATE_CHANGED');return prepare(kind,intent,originals);};f.lose();await expect(f.runtime().send({id:'lost-claim-exact-send',amountUsdCents:'200',rail:'reserve',recipient:'receiver.receiz.id'})).rejects.toThrow('reply lost');const intent=f.state().operations.at(-1)!.intent;expect(f.state().operations.at(-1)!.stages[0].phase).toBe('submitted');f.ports.native.preflightTransfer=async()=>{throw Error('CURRENT_QUOTE_INSUFFICIENT');};
 await expect(f.runtime().resume()).rejects.toThrow('NATIVE_CURRENT_RATE_CHANGED');const op=f.state().operations.at(-1)!;expect(op.intent).toEqual(intent);expect(op.complete).toBe(false);expect(op.result).toBeNull();expect(op.stages[0].phase).toBe('accepted');expect(f.blobs.has(op.stages[0].outcomeRef!)).toBe(true);expect(f.counts()).toMatchObject({claims:1,sends:0});
});
