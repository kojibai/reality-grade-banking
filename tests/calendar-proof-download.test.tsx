// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {canonicalizeReceizConstitution} from '@receiz/sdk';
import {CalendarRecordDetails} from '../src/features/messages/organizer/CalendarRecordDetails';
import {verifyCalendarProof} from '../src/receiz/calendar-proof';
import type {RecordProofExportInput} from '../src/receiz/record-proof-export';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {OrganizerEvent,NativeOrganizer} from '../src/receiz/native-organizer';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.restoreAllMocks());
async function fixture(){
 const event:OrganizerEvent={id:'10000000-0000-4000-8000-000000000003',ownerUserId:'owner',title:'Synthetic sale',kind:'traction',source:'system',startAt:'2026-11-04T12:00:00Z',endAt:'2026-11-04T12:10:00Z',location:'',note:'',attendees:[],metadata:{actionKind:'market.share.sell',amountUsdCents:'590'},createdAt:'2026-11-04T12:00:00Z',updatedAt:'2026-11-04T12:00:00Z'};
 const core={kind:'receiz.calendar.event.bundle.v1',version:1,hashAlgorithm:'sha256-jcs',event,provenance:{},conversation:{},visitor:{kind:'unknown'},summary:null},hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalizeReceizConstitution(core))))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const proof=await verifyCalendarProof({ok:true,bundleHash:hash,bundle:{...core,bundleHash:hash}},event,'owner'),eventProof=vi.fn(async()=>proof),api={accountUid:'owner',eventProof} as unknown as NativeOrganizer,sealRecordExport=vi.fn(async(_input:RecordProofExportInput)=>new File([new Uint8Array([1,2,3])],'sdk-selected.receized.json',{type:'application/json'})),identity={sealRecordExport} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:canonical-export'),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{}),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const render=(selected=event,owner=identity)=>act(async()=>root.render(<CalendarRecordDetails event={selected} identity={owner} api={api}/>));
 await render();return{event,proof,identity,api,host,sealRecordExport,eventProof,create,click,revoke,render,async inspect(){await act(async()=>{const details=host.querySelector<HTMLDetailsElement>('.organizer-record-proof')!;details.open=true;details.dispatchEvent(new Event('toggle'));});},close(){act(()=>root.unmount());host.remove();}};
}
it('seals only on explicit Download and downloads the exact SDK file instead of serializing the projection',async()=>{
 const f=await fixture();try{expect(f.eventProof).not.toHaveBeenCalled();expect(f.sealRecordExport).not.toHaveBeenCalled();await f.inspect();expect(f.sealRecordExport).not.toHaveBeenCalled();expect(f.create).not.toHaveBeenCalled();const button=[...f.host.querySelectorAll('button')].find(b=>b.textContent?.includes('Download proof record'));expect(button).toBeTruthy();await act(async()=>button!.click());expect(f.eventProof).toHaveBeenCalledOnce();expect(f.sealRecordExport).toHaveBeenCalledOnce();expect(f.sealRecordExport.mock.calls[0][0]).toMatchObject({recordHash:f.proof.bundleHash,mimeType:'application/json'});expect(new Uint8Array(await(f.create.mock.calls[0][0] as Blob).arrayBuffer())).toEqual(new Uint8Array([1,2,3]));expect((f.click.mock.instances[0] as HTMLAnchorElement).download).toBe('sdk-selected.receized.json');}finally{f.close();}
});
it('does not deliver a late capture after the selected record changes',async()=>{
 const f=await fixture();try{let finish!:(file:File)=>void;f.sealRecordExport.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));await f.inspect();const button=[...f.host.querySelectorAll('button')].find(b=>b.textContent?.includes('Download proof record'));expect(button).toBeTruthy();await act(async()=>button!.click());await f.render({...f.event,updatedAt:'2026-11-05T12:00:00Z'});await act(async()=>finish(new File(['late'],'late.receized.json')));expect(f.create).not.toHaveBeenCalled();expect(f.click).not.toHaveBeenCalled();}finally{f.close();}
});
