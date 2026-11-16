/** Authored draft validation and exact arithmetic. No identity, Source or transport. */
export type ProposalItem=Readonly<{description:string;quantity:string;unitPriceUsdCents:string}>;
export type ProposalDraft=Readonly<{kind:'proposal'|'invoice';title:string;summary:string;items:readonly ProposalItem[];deliverables:readonly string[];timeline:string;terms:string}>;
const fail=():never=>{throw Error('PROPOSAL_INPUT_INVALID');};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const text=(v:unknown,max:number,required=true):v is string=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim())&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
function exact(v:Record<string,unknown>,fields:readonly string[]){if(Object.keys(v).some(k=>!fields.includes(k)))fail();}
function quantity(value:unknown){if(typeof value!=='string'||! /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(value))return fail();const [whole,part='']=value.split('.'),n=BigInt(whole)*1000n+BigInt(part.padEnd(3,'0'));if(n<=0n)fail();return n;}
/** Exact document arithmetic only. This grants no balance or settlement authority. */
export function proposalTotal(items:readonly ProposalItem[]):string{
 if(!Array.isArray(items)||!items.length||items.length>40)fail();let total=0n;
 for(const item of items){if(!object(item)||!text(item.description,500)||typeof item.unitPriceUsdCents!=='string'||!/^(0|[1-9]\d{0,18})$/.test(item.unitPriceUsdCents))fail();exact(item,['description','quantity','unitPriceUsdCents']);const product=quantity(item.quantity)*BigInt(item.unitPriceUsdCents);if(product%1000n!==0n)throw Error('PROPOSAL_FRACTIONAL_CENT');total+=product/1000n;}
 if(total<=0n||total>9223372036854775807n)fail();return total.toString();
}
export function readEditableProposalDraft(raw:unknown):ProposalDraft{
 if(!object(raw))return fail();exact(raw,['kind','title','summary','items','deliverables','timeline','terms']);
 if(!['proposal','invoice'].includes(String(raw.kind))||!text(raw.title,160,false)||!text(raw.summary,2000,false)||!Array.isArray(raw.items)||!raw.items.length||raw.items.length>40||!Array.isArray(raw.deliverables)||raw.deliverables.length>24||raw.deliverables.some(v=>!text(v,500))||!text(raw.timeline,1000,false)||!text(raw.terms,6000,false))return fail();
 for(const item of raw.items){if(!object(item)||!text(item.description,500,false)||typeof item.unitPriceUsdCents!=='string'||! /^(?:|0|[1-9]\d{0,18})$/.test(item.unitPriceUsdCents))fail();exact(item,['description','quantity','unitPriceUsdCents']);quantity(item.quantity);}
 return structuredClone(raw) as unknown as ProposalDraft;
}
export function readProposalDraft(raw:unknown):ProposalDraft{
 const draft=readEditableProposalDraft(raw);if(!draft.title.trim()||!draft.summary.trim())fail();proposalTotal(draft.items);return draft;
}
export function readGeneratedProposalDraft(message:string):ProposalDraft{
 if(!text(message,24000))return fail();const content=message.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let value:unknown;try{value=JSON.parse(content);}catch{throw Error('PROPOSAL_DRAFT_NEEDS_REVIEW');}return readEditableProposalDraft(value);
}
