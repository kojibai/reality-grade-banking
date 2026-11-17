import {PDFDocument} from 'pdf-lib';
import {conformanceOfflineFixture} from './conformance-offline-sealer';
import {createFixedSale} from '../../src/receiz/fixed-checkout';
import {createChatProposal} from '../../src/receiz/chat-proposal';
import {bindProposalDocument} from '../../src/receiz/proposal-document';
export const invoiceOwner='11111111-1111-4111-8111-111111111111',invoiceBuyer='22222222-2222-4222-8222-222222222222',invoiceId='33333333-3333-4333-8333-333333333333',invoiceConversation='44444444-4444-4444-8444-444444444444';
export async function invoiceFixture(){
 const fixture=await conformanceOfflineFixture({account:true}),admission=await fixture.runtime.createReceizArtifactAdmissionEngine()(await fixture.runtime.verifyReceizArtifact(fixture.identity.bytes),{profile:'identity',identityPassphrase:fixture.identity.phrase}),binding=await fixture.runtime.readReceizIdentityPublicBinding(admission);
 const sealer=fixture.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:fixture.store,resources:fixture.resources,fetch:async()=>{throw Error('NETWORK_FORBIDDEN');}});
 return{...fixture,binding,sealer};
}
export async function invoiceTerms(ownerReceizId?:string){return createChatProposal({id:invoiceId,conversationId:invoiceConversation,createdAt:'2026-11-17T12:00:00.000Z',issuer:{userId:invoiceOwner,name:'Maya Studio',username:'mayastudio',...(ownerReceizId?{ownerReceizId}:{})},recipients:[invoiceBuyer],draft:{kind:'invoice',title:'Website launch',summary:'The agreed design and launch work.',items:[{description:'Website design',quantity:'1',unitPriceUsdCents:'10000'},{description:'Launch support',quantity:'2',unitPriceUsdCents:'2500'}],deliverables:['Website files'],timeline:'',terms:'Thank you for working with us.'},branding:{issuerName:'Maya Studio',issuerDetails:'hello@maya.example',clientName:'Alex Chen',clientDetails:'Alex Studio'},source:{messageIds:[],digest:'a'.repeat(64),hasEarlier:false},fixedSale:await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:invoiceId,recipientUserId:invoiceOwner,username:'mayastudio',currency:'usd',amountUsdCents:'15000'})});}
export async function invoicePdf(proposal?:Awaited<ReturnType<typeof invoiceTerms>>){proposal??=await invoiceTerms();const pdf=await PDFDocument.create();pdf.addPage();return bindProposalDocument(new Uint8Array(await pdf.save()),proposal);}
