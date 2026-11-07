import {expect,it} from 'vitest';
import {RECEIVING_MESSAGE,receivingInvitationUrl,readReceivingInvitation,institutionRequest,type ReceivingInvitation} from '../src/adoption/invitation';

const invitation:ReceivingInvitation={schema:'bankeiz.receiving-invitation.v1',message:'Ready when you are — お支払い',senderName:'Mira',institution:{id:'example-bank',name:'Example Bank'},amountUsdCents:'480000',purpose:'Invoice #1048'};
const rawHash=(value:unknown)=>'#invite='+Buffer.from(JSON.stringify(value),'utf8').toString('base64url');

it('carries the reviewed Unicode invitation in the fragment without a recipient coordinate or query',()=>{
 const url=new URL(receivingInvitationUrl(invitation));
 expect(url.origin+url.pathname).toBe('https://bankeiz.com/receiving/');expect(url.search).toBe('');
 expect(readReceivingInvitation(url.hash)).toEqual(invitation);
 const payload=JSON.parse(Buffer.from(url.hash.slice(8),'base64url').toString('utf8'));
 expect(Object.keys(payload)).toEqual(['schema','message','senderName','institution','amountUsdCents','purpose']);
 expect(receivingInvitationUrl({...invitation,purpose:'Invoice #1048'})).toBe(url.href);
});
it('keeps the standard invitation usable without financial or identity state',()=>{
 const simple={schema:'bankeiz.receiving-invitation.v1' as const,message:RECEIVING_MESSAGE};
 expect(readReceivingInvitation(new URL(receivingInvitationUrl(simple)).hash)).toEqual(simple);
 expect(readReceivingInvitation('')).toBeNull();
});
it.each(['recipient','recipientEmail','recipientUserId','draftId','balance','verified','accepted','routeAvailable','originals'])('refuses unexpected %s rather than publishing private context or authority claims',field=>{
 const changed={...invitation,[field]:'private@example.com'};
 expect(()=>receivingInvitationUrl(changed)).toThrow();expect(readReceivingInvitation(rawHash(changed))).toBeNull();
});
it('rejects malformed, oversized, conflicting or noncanonical fragment encodings',()=>{
 for(const hash of ['#invite=','invite=YWJj','#invite=%%%','#invite=eyJ9&other=value','#invite='+Buffer.from([0xff]).toString('base64url'),'#invite='+ 'A'.repeat(12300),rawHash({...invitation,schema:'another'}),rawHash({...invitation,message:'x'.repeat(4001)}),rawHash({...invitation,amountUsdCents:'-1'}),rawHash({...invitation,institution:{name:'Bank',url:'https://untrusted.example'}})])expect(readReceivingInvitation(hash)).toBeNull();
 expect(()=>receivingInvitationUrl({...invitation,message:'x'.repeat(4001)})).toThrow();
 expect(()=>receivingInvitationUrl({...invitation,message:'漢'.repeat(4000)})).toThrow();
});
it('preserves untrusted text as text and rejects controls and invalid UTF-16 without interpreting it',()=>{
 const message='<script>do not execute</script>\nPlease review the standard.';
 expect(readReceivingInvitation(new URL(receivingInvitationUrl({...invitation,message})).hash)?.message).toBe(message);
 for(const message of ['','\u0000hello','\ud800'])expect(()=>receivingInvitationUrl({...invitation,message})).toThrow();
});
it('prepares an institutional request using fixed destinations and a safe optional Registry fragment',()=>{
 const text=institutionRequest('Example Bank','example-bank');
 expect(text).toContain('Example Bank');expect(text).toContain('https://bankeiz.com/standards/');
 expect(text).toContain('https://github.com/kojibai/reality-grade-banking/blob/main/institution/README.md');
 expect(text).toContain('https://bankeiz.com/conformance/#assess');expect(text).toContain('https://bankeiz.com/registry/#example-bank');
 expect(institutionRequest('An unlisted institution')).toContain('https://bankeiz.com/registry/');
 expect(text).not.toMatch(/already conforms|qualified receiver|payment sent|guaranteed/i);
 expect(()=>institutionRequest('Bank','https://evil.example')).toThrow();
});
