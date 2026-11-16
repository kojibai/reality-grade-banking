import {expect,it} from 'vitest';
import {proposalTotal,readProposalDraft,createChatProposal,proposalMessageBody,readChatProposal,proposalContentDigest,readProposalEvent,proposalEventBody,projectProposalEvents,readGeneratedProposalDraft} from '../src/receiz/chat-proposal';
import {createFixedSale} from '../src/receiz/fixed-checkout';
const owner='11111111-1111-4111-8111-111111111111',buyer='22222222-2222-4222-8222-222222222222',thread='33333333-3333-4333-8333-333333333333',id='44444444-4444-4444-8444-444444444444';
const draft={kind:'proposal' as const,title:'Website review',summary:'Review the booking flow.',items:[{description:'Review and written action plan',quantity:'1.5',unitPriceUsdCents:'5000'}],deliverables:['Live review','Written action plan'],timeline:'Thursday at 2 PM',terms:'Includes one revision.'};
const message=(body:string,sender=owner)=>({id:'55555555-5555-4555-8555-555555555555',conversationId:thread,senderUserId:sender,senderKind:'user' as const,senderAiId:null,senderDisplay:'Participant',body,createdAt:'2026-11-15T22:00:00.000Z',receizedAt:'2026-11-15T22:00:00.000Z',receipt:null,sealedOriginalAvailable:false});
async function fixture(){const fixedSale=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:id,recipientUserId:owner,username:'mayaexample',currency:'usd',amountUsdCents:'7500'});return createChatProposal({id,conversationId:thread,createdAt:'2026-11-15T21:00:00.000Z',issuer:{userId:owner,name:'Maya',username:'mayaexample'},recipients:[buyer],draft,source:{messageIds:[id],digest:'a'.repeat(64),hasEarlier:true},fixedSale});}
it('calculates decimal quantities with integer arithmetic, refusing rounding and malformed amounts',()=>{
 expect(proposalTotal(draft.items)).toBe('7500');
 expect(()=>proposalTotal([{description:'Work',quantity:'0.001',unitPriceUsdCents:'1'}])).toThrow();
 expect(()=>proposalTotal([{description:'Work',quantity:'1e2',unitPriceUsdCents:'100'}])).toThrow();
 expect(()=>proposalTotal([{description:'Work',quantity:'1',unitPriceUsdCents:'-1'}])).toThrow();
});
it('retains complete reviewed terms and original source coordinates in the native message',async()=>{
 const proposal=await fixture(),body=proposalMessageBody(proposal),parsed=readChatProposal(message(body));
 expect(parsed).toEqual(proposal);expect(parsed?.source.hasEarlier).toBe(true);expect(parsed?.draft.terms).toBe(draft.terms);expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(16384);
});
it('refuses a changed amount, recipient, conversation, creator or AI-authored proposal',async()=>{
 const p=await fixture();expect(()=>createChatProposal({...p,fixedSale:{...p.fixedSale,amountUsdCents:'1'}})).toThrow();
 const body=proposalMessageBody(p);expect(readChatProposal({...message(body),conversationId:id})).toBeNull();expect(readChatProposal(message(body,buyer))).toBeNull();expect(readChatProposal({...message(body),senderKind:'ai'})).toBeNull();
 expect(()=>createChatProposal({...p,recipients:[owner]})).toThrow();expect(()=>createChatProposal({...p,fixedSale:{...p.fixedSale,recipientUserId:buyer}})).toThrow();
});
it('rejects over-capacity wire messages rather than dropping terms or source history',async()=>{
 const p=await fixture();expect(()=>proposalMessageBody({...p,draft:{...p.draft,terms:'あ'.repeat(6000)}})).toThrow();
});
it('a revised proposal invalidates prior acceptance and participant spoofing is refused',async()=>{
 const p=await fixture(),digest=await proposalContentDigest(p),body=proposalEventBody({schema:'bankeiz.chat.proposal-event.v1',proposalId:p.id,proposalDigest:digest,conversationId:thread,kind:'accepted'});
 expect(readProposalEvent(message(body,buyer),p,digest)?.kind).toBe('accepted');expect(readProposalEvent(message(body,owner),p,digest)).toBeNull();expect(readProposalEvent(message(body,'66666666-6666-4666-8666-666666666666'),p,digest)).toBeNull();
 const revised=createChatProposal({...p,draft:{...p.draft,terms:'Changed terms'}});expect(await proposalContentDigest(revised)).not.toBe(digest);expect(readProposalEvent(message(body,buyer),revised,await proposalContentDigest(revised))).toBeNull();
});
it('does not project paid status from any authored proposal event and deduplicates exact events',async()=>{
 const p=await fixture(),digest=await proposalContentDigest(p),accepted=message(proposalEventBody({schema:'bankeiz.chat.proposal-event.v1',proposalId:p.id,proposalDigest:digest,conversationId:thread,kind:'accepted'}),buyer);
 const view=projectProposalEvents(p,digest,[accepted,accepted]);expect(view.acceptedBy).toEqual([buyer]);expect(view).not.toHaveProperty('paid');
 expect(()=>proposalEventBody({schema:'bankeiz.chat.proposal-event.v1',proposalId:p.id,proposalDigest:digest,conversationId:thread,kind:'paid' as never})).toThrow();
});
it('delivery must be sent by issuer with a native attachment and acknowledgment by the recipient',async()=>{
 const p=await fixture(),digest=await proposalContentDigest(p),body=proposalEventBody({schema:'bankeiz.chat.proposal-event.v1',proposalId:p.id,proposalDigest:digest,conversationId:thread,kind:'delivery',note:'Action plan'});
 expect(readProposalEvent(message(body),p,digest)).toBeNull();expect(readProposalEvent({...message(body),walletTransfer:{kind:'chat_attachment',name:'plan.pdf'}},p,digest)?.kind).toBe('delivery');expect(readProposalEvent({...message(body,buyer),walletTransfer:{kind:'chat_attachment'}},p,digest)).toBeNull();
});
it('treats generated JSON as a draft only and rejects executable or unreviewed extra fields',()=>{
 expect(readGeneratedProposalDraft('```json\n'+JSON.stringify(draft)+'\n```')).toEqual(readProposalDraft(draft));
 expect(()=>readGeneratedProposalDraft(JSON.stringify({...draft,approved:true}))).toThrow();expect(()=>readProposalDraft({...draft,items:[]})).toThrow();
});
