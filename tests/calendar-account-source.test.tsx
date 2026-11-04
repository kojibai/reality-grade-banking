// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {createCalendarStatementProjection,mergeCalendarSourceEvents,projectCalendarFinancialRecords} from '../src/receiz/calendar-source-projection';
import {CalendarRecordDetails} from '../src/features/messages/organizer/CalendarRecordDetails';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
import {walletPointTime} from '../src/receiz/wallet-series';
import type {VerifiedAccountProof} from '../src/receiz/account-proof';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {PublicRecord} from '../src/receiz/public-network';
const held=vi.hoisted(()=>new WeakMap<object,Uint8Array>());
// Admitted-capability/file wiring only, matching the existing account-ledger
// harness. Unmocked SDK refusal and conformance tests remain separate evidence.
vi.mock('../src/receiz/account-proof',async original=>({...await original<typeof import('../src/receiz/account-proof')>(),isVerifiedAccountProof:(v:object)=>held.has(v),heldAccountProofBytes:(v:object)=>{const bytes=held.get(v);if(!bytes)throw Error('ACCOUNT_PROOF_VERIFIED_SOURCE_REQUIRED');return bytes.slice();}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const owner={keyId:'a'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'},uid='owner';
function proof(){
 const value={sourceDigest:'b'.repeat(64),writer:owner.artifactOwnerReceizId,statement:{account:{keyId:owner.keyId,receizId:owner.artifactOwnerReceizId},transactions:[{transactionId:'held-note-credit',eventDigest:'c'.repeat(64),kind:'note-deposited',description:'Note deposited',kaiUPulse:'14970000000001',reserveDeltaUsdCents:'125',settlementDeltaPhiMicro:'7',balanceDeltaPhiMicro:'17'}]}} as unknown as VerifiedAccountProof;
 held.set(value,new TextEncoder().encode('exact-existing-held-account-proof-wire'));return value;
}
it('projects a held capability once per source/represented frame, retains exact deltas/Kai and refuses copied or foreign proof handles',()=>{
 const source=proof(),projection=createCalendarStatementProjection(owner),represented:PublicRecord[]=[],rows=projection.events(uid,source,represented);
 expect(rows).toHaveLength(1);expect(projection.events(uid,source,represented)).toBe(rows);expect(rows[0].startAt).toBe(walletPointTime('14970000000001'));
 expect(rows[0].metadata).toMatchObject({reserveDeltaUsdCents:'125',settlementDeltaPhiMicro:'7',balanceDeltaPhiMicro:'17',kaiUpulse:'14970000000001'});expect(rows[0].metadata).not.toHaveProperty('amountUsdCents');
 expect(projection.events(uid,{...source},represented)).toEqual([]);expect(createCalendarStatementProjection({...owner,keyId:'foreign'}).events(uid,source,represented)).toEqual([]);
 expect(projection.file(source.sourceDigest,uid)).toBe(source);expect(projection.file(source.sourceDigest,'foreign')).toBeNull();
 const record={id:'wallet:held-note-credit',sourceId:'held-note-credit',source:'wallet',authority:'account-source-projection',evidence:{entryHash:'c'.repeat(64)},kind:'note_claim',title:'Note deposited',time:rows[0].startAt,amountUsdCents:'125',detail:'',actor:null,kaiUpulse:null,pulse:null,sourceUrl:null} satisfies PublicRecord;
 expect(projection.events(uid,source,[record])).toEqual([]);
 expect(mergeCalendarSourceEvents(rows,projectCalendarFinancialRecords(uid,[record]))).toHaveLength(1);
});
it('saves the exact held account-proof file only on request and never asks for a Calendar bundle, proof refresh, share or write',async()=>{
 const source=proof(),projection=createCalendarStatementProjection(owner),events=projection.events(uid,source,[]),request=vi.fn(async()=>{throw Error('NETWORK_FORBIDDEN');}),api=createNativeOrganizer({accountUid:uid,request,heldEvents:()=>events});
 const accountProof=vi.fn(),identity={accountProof,knownCalendarAccountProof:(digest:string)=>projection.file(digest,uid)} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:held-account-proof'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{}),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 try{
  await act(async()=>root.render(<CalendarRecordDetails event={events[0]} identity={identity} api={api}/>));
  expect(host.textContent).toContain('$1.25');expect(host.textContent).toContain('0.000007 Φ');expect(host.textContent).not.toContain('Calendar proof');expect(create).not.toHaveBeenCalled();
  const save=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Save account proof'))!;expect(save).toBeTruthy();await act(async()=>save.click());
  const blob=create.mock.calls[0][0] as Blob;expect(await blob.text()).toBe('exact-existing-held-account-proof-wire');expect(click).toHaveBeenCalledOnce();expect(accountProof).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());create.mockRestore();revoke.mockRestore();click.mockRestore();}
});
it('keeps carried account movement details after reopen and opens only its exact retained file when saving',async()=>{
 const source=proof(),projection=createCalendarStatementProjection(owner),event=JSON.parse(JSON.stringify(projection.events(uid,source,[])[0]));
 const request=vi.fn(async()=>{throw Error('NETWORK_FORBIDDEN');}),api=createNativeOrganizer({accountUid:uid,request}),accountProof=vi.fn();
 const saved=vi.fn(async(digest:string)=>digest===source.sourceDigest?source:null),identity={accountProof,knownCalendarAccountProof:()=>null,calendarAccountProof:saved} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:retained-account-proof'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{}),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 try{
  await act(async()=>root.render(<CalendarRecordDetails event={event} identity={identity} api={api}/>));
  expect(host.textContent).toContain('$1.25');expect(host.textContent).toContain('0.000007 Φ');expect(host.textContent).not.toContain('Calendar proof');expect(saved).not.toHaveBeenCalled();
  const save=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Save account proof'))!;expect(save).toBeTruthy();await act(async()=>save.click());
  expect(saved).toHaveBeenCalledExactlyOnceWith(source.sourceDigest);expect(await (create.mock.calls[0][0] as Blob).text()).toBe('exact-existing-held-account-proof-wire');expect(accountProof).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());create.mockRestore();revoke.mockRestore();click.mockRestore();}
});
