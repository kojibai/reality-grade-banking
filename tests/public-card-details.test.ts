import {expect,it} from 'vitest';
import {parsePublicCardDetails} from '../src/receiz/public-card-details';
const cardId='rsc_0123456789abcdef',claimHash='a'.repeat(64),binding={cardId,claimHash};
const issue={eventKind:'issue',collectibleId:cardId,claimHash,appendHash:'b'.repeat(64),occurredAt:'2026-10-01T12:00:00Z',owner:{username:'first',displayName:'First'}};
const transfer={...issue,eventKind:'transfer',appendHash:'c'.repeat(64),occurredAt:'2026-10-18T12:00:00Z',owner:{username:'current',displayName:'Current'}};
const packet=(rows:unknown[])=>({ok:true,cardId,claimHash,count:rows.length,provenance:rows});
it('reads the current public owner and original issue time for the exact card claim',()=>{
 const result=parsePublicCardDetails(packet([transfer,issue]),binding);
 expect(result).toMatchObject({ownerUsername:'current',ownerDisplayName:'Current',ownerProfileUrl:'https://receiz.com/current',sealedAt:issue.occurredAt});
 expect(result.history?.map(event=>event.id)).toEqual([issue.appendHash,transfer.appendHash]);
});
it('does not confuse a later transfer time with the original seal time',()=>{
 expect(parsePublicCardDetails(packet([transfer]),binding).sealedAt).toBeNull();
});
it('leaves an ambiguous latest owner unknown',()=>{
 expect(parsePublicCardDetails(packet([issue,transfer,{...transfer,appendHash:'d'.repeat(64),owner:{username:'other'}}]),binding).ownerUsername).toBeNull();
});
it('does not assign one copy’s latest owner or issue time to an entire edition',()=>{
 expect(parsePublicCardDetails(packet([issue,transfer]),{...binding,circulationCount:2})).toMatchObject({ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,sealedAt:null});
});
it('recognizes multiple issuance events even without a circulation summary',()=>{
 expect(parsePublicCardDetails(packet([issue,{...transfer,eventKind:'issue'}]),binding).ownerUsername).toBeNull();
});
it.each([
 {...packet([issue]),claimHash:'e'.repeat(64)},packet([{...issue,claimHash:'e'.repeat(64)}]),
 {...packet([issue]),count:200},packet([{...issue,occurredAt:'invalid'}]),packet([issue,issue]),
])('refuses incomplete or mismatched public history',input=>{expect(()=>parsePublicCardDetails(input,binding)).toThrow();});
it('does not render arbitrary owner links or fields',()=>{
 const details=parsePublicCardDetails(packet([{...issue,owner:{username:'https://evil.example',displayName:'Public owner',email:'private'}}]),binding);
 expect(details.ownerProfileUrl).toBeNull();expect(JSON.stringify(details)).not.toContain('evil');expect(JSON.stringify(details)).not.toContain('private');
});
