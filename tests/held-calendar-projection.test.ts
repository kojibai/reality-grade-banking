import {expect,it,vi} from 'vitest';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
import {createReceizIdentityKeyFile,appendReceizIdentityPortableState,projectReceizIdentityAccount,canonicalizeReceizConstitution} from '@receiz/sdk';
import {verifyCalendarProof} from '../src/receiz/calendar-proof';
import {projectCalendarOriginal,projectCalendarFinancialRecords,heldCalendarRecords,mergeCalendarSourceEvents,calendarSourceProofUrl} from '../src/receiz/calendar-source-projection';
import {projectPersonalHistory} from '../src/receiz/personal-history';
import {updatePrivateHistory} from '../src/receiz/private-history-restore';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {createLocalPbiAuthorshipProof} from '../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';

const uid='eecb99a0-9c6a-4e89-813b-f76331ea9c41';
const original={id:'imported-'+'a'.repeat(64),slug:'20261102_0942',code:'21188918',pulse:'14955302',createdAt:'2026-11-02T14:42:03.163Z',claim:'A held Original',claimHashHex:'b'.repeat(64),verifyUrl:'https://receiz.com/v/20261102_0942/21188918/14955302?c=held-proof',hasPbiSignature:false};
const range={start:'2026-11-01T00:00:00Z',end:'2026-11-05T00:00:00Z'};
const legacy={id:'00000000-0000-4000-8000-000000000001',ownerUserId:uid,title:'Receized record',kind:'recorded_moment',source:'system',startAt:original.createdAt,endAt:'2026-11-02T14:52:03.163Z',createdAt:original.createdAt,updatedAt:original.createdAt,location:'',note:'',attendees:[],metadata:{actionKind:'receiz.record.insert',receizId:original.id}};

it('paints the exact seal moment from an actual SDK-admitted portable Original without requesting Calendar or rereading its source',async()=>{
 const key=await createReceizIdentityKeyFile({owner:{uid,username:'calendar-fixture'},passphrase:'test-only-internal-phrase'});
 const saved=await appendReceizIdentityPortableState({keyFile:key.keyFile,passphrase:'test-only-internal-phrase',snapshot:{schema:'receiz.account.state.v3',account:{userId:uid},profileView:{profile:{userId:uid},originals:[original]}}});
 const admitted=await projectReceizIdentityAccount(saved);expect(admitted.portableStateVerified).toBe(true);
 const request=vi.fn(async()=>{throw Error('NETWORK_FORBIDDEN');}),api=createNativeOrganizer({accountUid:uid,request,carried:admitted.verifiedState});
 const events=api.knownEvents(range);expect(events).toHaveLength(1);expect(events?.[0].startAt).toBe(original.createdAt);expect(request).not.toHaveBeenCalled();
});

it('keeps the actual legacy Calendar UUID and proof record while adding its exact held Original proof link',async()=>{
 const request=vi.fn(),api=createNativeOrganizer({accountUid:uid,request,carried:{account:{userId:uid},calendar:{events:[legacy]},profileView:{profile:{userId:uid},originals:[original]}}});
 const events=api.knownEvents(range);expect(events).toHaveLength(1);expect(events?.[0].id).toBe(legacy.id);expect(events?.[0].metadata).toEqual(legacy.metadata);
 expect(events?.[0]).toHaveProperty('sourceProof.url',original.verifyUrl);expect(request).not.toHaveBeenCalled();
 const core={kind:'receiz.calendar.event.bundle.v1',version:1,hashAlgorithm:'sha256-jcs',event:legacy},bundleHash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalizeReceizConstitution(core)))).toString('hex');
 await expect(verifyCalendarProof({ok:true,bundle:{...core,bundleHash},bundleHash},events![0],uid)).resolves.toHaveProperty('bundleHash',bundleHash);
});

async function signedOriginal(){
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),spki=await crypto.subtle.exportKey('spki',keys.publicKey),encode=(v:ArrayBuffer|Uint8Array)=>Buffer.from(v instanceof Uint8Array?v:new Uint8Array(v)).toString('base64url');
 const credential={credIdB64Url:'AQI',pubKeyPem:`-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64')}\n-----END PUBLIC KEY-----`};
 const proof=await createLocalPbiAuthorshipProof({input:{slug:original.slug,code:original.code,pulse:original.pulse,claimHashHex:original.claimHashHex},credential,dependencies:{now:()=>Date.parse('2026-11-03T18:22:00Z'),performAssertion:async({challengeB64Url,credIdB64Url,pubKeyPem})=>{
  const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge:challengeB64Url,origin:'https://bankeiz.com',crossOrigin:false})),payload=new Uint8Array(69);payload.set(auth);payload.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),37);
  return{credIdB64Url,pubKeyPem,authenticatorDataB64Url:encode(auth),clientDataJSONB64Url:encode(client),signatureB64Url:encode(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,payload))};
 },verifyAssertion:args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com'],requireUP:true,requireUV:true}})}});
 return{...original,hasPbiSignature:true,pbiReceiptHash:proof.pbiReceiptHash,pbiAuthorshipProof:proof};
}
it('uses the carried Nov2 seal and real Nov3 PBI moments, updates an already open organizer, and never invents a signature Kai',async()=>{
 const signed=await signedOriginal();let sources=projectCalendarOriginal(uid,original);const request=vi.fn(async()=>{throw Error('NETWORK_FORBIDDEN');}),api=createNativeOrganizer({accountUid:uid,request,heldEvents:()=>sources});
 const first=api.knownEvents(range);expect(first).toHaveLength(1);expect(api.knownEvents(range)).toBe(first);
 sources=projectCalendarOriginal(uid,signed);api.syncHeldEvents();const events=api.knownEvents(range)!;
 expect(events).toHaveLength(2);expect(events.map(row=>row.startAt)).toEqual([original.createdAt,'2026-11-03T18:22:00.000Z']);
 expect(events[1].metadata).not.toHaveProperty('pulse');expect(events[1].metadata).not.toHaveProperty('kaiUpulse');
 expect(calendarSourceProofUrl(events[1])).toBe(original.verifyUrl);
 sources=projectCalendarOriginal(uid,original);api.syncHeldEvents();expect(api.knownEvents(range)).toHaveLength(2);
 await expect(api.eventProof(events[1])).rejects.toThrow('ORGANIZER_SOURCE_PROOF_LINK');
 await expect(api.saveEvent({title:'change',startAt:events[1].startAt,endAt:events[1].endAt},events[1].id)).rejects.toThrow('ORGANIZER_EVENT_INVALID');
 expect(request).not.toHaveBeenCalled();
});
it('refuses invented signature dates, flags, mismatched proof identity, unsafe links and foreign portable owners',async()=>{
 const signed=await signedOriginal();
 for(const row of [{...original,hasPbiSignature:true,pbiReceiptHash:signed.pbiReceiptHash},{...signed,pbiAuthorshipProof:{...signed.pbiAuthorshipProof,verifiedAt:''}},{...signed,pbiReceiptHash:'0'.repeat(64)},{...signed,pbiAuthorshipProof:{...signed.pbiAuthorshipProof,input:{...signed.pbiAuthorshipProof.input,claimHashHex:'0'.repeat(64)}}}])expect(projectCalendarOriginal(uid,row)).toHaveLength(1);
 for(const row of [{...original,verifyUrl:'https://foreign.test/v/a'},{...original,verifyUrl:original.verifyUrl.replace('21188918','00000000')},{...original,createdAt:''}])expect(projectCalendarOriginal(uid,row)).toEqual([]);
 const api=createNativeOrganizer({accountUid:uid,request:vi.fn(),carried:{account:{userId:'foreign'},profileView:{originals:[signed]}}});expect(api.knownEvents(range)).toBeNull();
});
it('composes exact already-held financial movements without projecting Original valuations as money or duplicating a legacy UUID',async()=>{
 const key=await createReceizIdentityKeyFile({owner:{uid,username:'calendar-fixture'},passphrase:'test-only-internal-phrase'}),snapshot={schema:'receiz.account.state.v3',account:{userId:uid},wallet:{activityEvents:[{id:'wallet_ledger:00000000-0000-4000-8000-000000000002',kind:'wallet_ledger_entry',ledgerEntryKind:'note_claim',createdAt:'2026-11-03T16:00:00Z',amountUsdCents:'125',amountPhiMicro:'7',pulse:'14970000',kaiUpulse:'14970000000001',direction:'credit'}]}};
 const saved=await appendReceizIdentityPortableState({keyFile:key.keyFile,passphrase:'test-only-internal-phrase',snapshot}),projection=await projectReceizIdentityAccount(saved),records=projectPersonalHistory(projection,uid).records;
 const identity={binding:{keyId:projection.keyId,identityOwnerReceizId:projection.owner.uid},localHistory:projection} as OpenIdentity;
 expect(heldCalendarRecords(identity,uid)).toEqual(records);expect(heldCalendarRecords(identity,'foreign')).toEqual([]);
 const rows=projectCalendarFinancialRecords(uid,records);expect(rows).toHaveLength(1);expect(rows[0].startAt).toBe('2026-11-03T16:00:00Z');expect(rows[0].metadata).toMatchObject({actionKind:'receiz.wallet.note_claim',amountUsdCents:'125',kaiUpulse:'14970000000001'});
 const prior={...legacy,metadata:{actionKind:'receiz.wallet.note_claim',ledgerEntryId:'00000000-0000-4000-8000-000000000002',amountUsdCents:'125'}};
 expect(mergeCalendarSourceEvents([prior],rows)[0].id).toBe(legacy.id);
 updatePrivateHistory(identity,uid,{schema:'bank.private-history-cache.v1',accountUid:uid,observedAt:'2026-11-04T00:00:00Z',records,nextCursor:null});expect(heldCalendarRecords(identity,uid)).toHaveLength(1);
 expect(projectCalendarFinancialRecords(uid,[{...records[0],authority:'public-source-projection'},{...records[0],accountFlowConflict:true}])).toEqual([]);
 expect(projectCalendarOriginal(uid,{...original,marketPreview:{priceUsd:999999}})[0].metadata).not.toHaveProperty('amountUsdCents');
});
