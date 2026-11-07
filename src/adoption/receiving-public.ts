import {readReceivingInvitation,receivingInvitationUrl,institutionRequest,RECEIVING_MESSAGE,type ReceivingInvitation} from './invitation';
import {parsePaymentRequest} from '../receiz/payment-request';
const mounted=new WeakSet<HTMLElement>();
let retained:ReceivingInvitation|null=null,listening=false;
const amount=(value:string)=>{const cents=BigInt(value);return '$'+(cents/100n).toLocaleString('en-US')+'.'+String(cents%100n).padStart(2,'0');};
function field(root:HTMLElement,key:string){return root.querySelector<HTMLElement>(`[data-receiving-${key}]`)!;}
function text(root:HTMLElement,key:string,value:string){const node=root.querySelector<HTMLElement>(`[data-receiving-${key}]`);if(node){node.textContent=value;node.hidden=!value;}}
function paint(root:HTMLElement,invalid=false){
 const card=field(root,'invitation');card.hidden=!retained;text(root,'message',retained?.message??'');text(root,'sender',retained?.senderName?'From '+retained.senderName:'');const details=field(root,'details');details.replaceChildren();
 const entry=root.querySelector<HTMLElement>('[data-receiving-entry]');if(entry)entry.hidden=Boolean(retained);
 text(root,'recipient',retained?.recipientName?'Prepared for '+retained.recipientName:'');
 const profile=root.querySelector<HTMLAnchorElement>('[data-receiving-sender-profile]');if(profile){profile.hidden=!retained?.senderUsername;if(retained?.senderUsername){profile.setAttribute('href','/u/'+retained.senderUsername+'/');profile.textContent='View @'+retained.senderUsername+'’s profile';}else{profile.removeAttribute('href');profile.textContent='';}}
 const pair=(label:string,value:string)=>{const row=document.createElement('div'),term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value;row.append(term,description);details.append(row);};
 if(retained?.amountUsdCents)pair('Proposed payment',amount(retained.amountUsdCents));if(retained?.purpose)pair('Purpose',retained.purpose);if(retained?.institution)pair('Institution',retained.institution.name);details.hidden=!details.childNodes.length;
 text(root,'institution-context',retained?.institution?'Receiving context: '+retained.institution.name:'');const input=field(root,'institution-name') as HTMLInputElement;input.value=retained?.institution?.name??'';
 const assess=field(root,'assess') as HTMLAnchorElement,registry=field(root,'registry') as HTMLAnchorElement;if(retained?.institution){const url=new URL(receivingInvitationUrl({schema:'bankeiz.receiving-invitation.v1',message:RECEIVING_MESSAGE,institution:retained.institution}));url.pathname='/conformance/';assess.href=url.href;}else assess.href='/conformance/#assess';registry.href=retained?.institution?.id?'/registry/#'+encodeURIComponent(retained.institution.id):'/registry/';
 const notice=invalid?'This invitation could not be read. You can still receive directly using the options here.':'';text(root,'entry-status',notice);if(invalid)text(root,'status',notice);
}
async function copy(value:string,output:HTMLTextAreaElement,status:HTMLElement,copied='Copied. Share it with the sender when you are ready.'){output.value=value;try{if(!navigator.clipboard?.writeText)throw Error('COPY_UNAVAILABLE');await navigator.clipboard.writeText(value);status.textContent=copied;}catch{output.hidden=false;output.focus();output.select();status.textContent='Select and copy your response below.';}}
/** Page-local presentation only. No identity, account, delivery or payment read.
 * The static guide is already visible; invitation data stays in this module. */
export function init(){
 if(!/^\/(?:receiving|invitation)\/?$/.test(location.pathname))return;
 const roots=[...document.querySelectorAll<HTMLElement>('[data-receiving]')];if(!roots.length)return;let invalid=false;
 if(location.hash.startsWith('#invite=')){retained=readReceivingInvitation(location.hash);invalid=!retained;history.replaceState(null,'',location.pathname+location.search);}
 if(!listening){listening=true;addEventListener('hashchange',()=>init());}
 for(const root of roots){paint(root,invalid);if(mounted.has(root))continue;mounted.add(root);
  root.querySelector('[data-receiving-copy-link]')?.addEventListener('click',()=>{if(retained)void copy(receivingInvitationUrl(retained),field(root,'link-output') as HTMLTextAreaElement,field(root,'link-status'),'Invitation link copied.');});
  field(root,'clear').addEventListener('click',()=>{retained=null;const linkOutput=root.querySelector<HTMLTextAreaElement>('[data-receiving-link-output]');if(linkOutput){linkOutput.value='';linkOutput.hidden=true;}text(root,'link-status','');paint(root);const heading=root.querySelector<HTMLElement>('[data-receiving-entry] h1,.receiving-hero h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}});
  const form=field(root,'response-form') as HTMLFormElement,input=field(root,'coordinate') as HTMLInputElement,button=field(root,'copy') as HTMLButtonElement,share=field(root,'share') as HTMLButtonElement,output=field(root,'response') as HTMLTextAreaElement,status=field(root,'status');let response='';
  const update=()=>{try{parsePaymentRequest(input.value.trim());response='You can pay me using these receiving details: '+input.value.trim()+'. Please review the recipient and amount before sending.';button.disabled=false;share.disabled=false;}catch{response='';button.disabled=true;share.disabled=true;}output.hidden=true;status.textContent='';};input.addEventListener('input',update);
  form.addEventListener('submit',event=>{event.preventDefault();if(response)void copy(response,output,status);});
  share.hidden=typeof navigator.share!=='function';share.disabled=true;share.addEventListener('click',()=>{if(!response)return;void navigator.share({title:'My receiving details',text:response}).then(()=>{status.textContent='Your sharing choice is complete.';}).catch((error:unknown)=>{if(error&&typeof error==='object'&&'name' in error&&error.name==='AbortError')return;output.value=response;output.hidden=false;output.focus();output.select();status.textContent='Sharing could not open. Copy your response below.';});});
  const institutionForm=field(root,'institution-form') as HTMLFormElement,institutionInput=field(root,'institution-name') as HTMLInputElement;
  institutionForm.addEventListener('submit',event=>{event.preventDefault();try{const name=institutionInput.value.trim(),id=retained?.institution?.name===name?retained.institution.id:undefined;void copy(institutionRequest(name,id),field(root,'institution-response') as HTMLTextAreaElement,field(root,'institution-status'),'Copied. Share it with your institution when you are ready.');}catch{text(root,'institution-status','Enter the institution name to prepare its receiving request.');}});
 }
}
