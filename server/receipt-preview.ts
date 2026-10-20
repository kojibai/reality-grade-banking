import {readReceiptLink,type LedgerReceipt} from '../src/receiz/ledger-receipts';
import {BANK_PUBLIC_ORIGIN} from '../src/receiz/config';
import {formatMoney} from '../src/core/money';
import {ledgerRecordTitle} from '../src/receiz/ledger-payment-records';
import {ledgerValueLabel} from '../src/receiz/ledger-value';

type PreviewDependencies={page():Promise<string>;image(receipt:LedgerReceipt):Promise<Uint8Array>};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const clean=(value:string,max:number)=>value.replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function receiptPreviewText(receipt:LedgerReceipt){
 const cents=receipt.value?receipt.value.amountUsdCents:receipt.amountUsdCents;
 const amount=cents===null?'Source record':formatMoney(cents);
 const title=clean(ledgerRecordTitle({kind:receipt.kind,title:receipt.title,source:receipt.source} as Parameters<typeof ledgerRecordTitle>[0]),60);
 const parties=[receipt.sender,receipt.recipient].filter(Boolean).map(name=>clean(name!,40)).join(' → ');
 const time=receipt.time?new Date(receipt.time).toLocaleString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+' UTC':receipt.pulse?`☤KAI ${BigInt(receipt.pulse).toLocaleString('en-US')}`:'Source-carried receipt';
 return {amount,title,parties,time,valueLabel:receipt.value?ledgerValueLabel(receipt.value):'Recorded amount'};
}
function receiptHtml(html:string,receipt:LedgerReceipt,canonical:string,packet:string){
 const text=receiptPreviewText(receipt),title=`${text.amount} · ${text.title} | Bankeiz`,description=[text.parties,text.time,'Open the receipt for its carried record and technical details.'].filter(Boolean).join(' · ');
 const image=`${BANK_PUBLIC_ORIGIN}/api/receipt?r=${packet}&image=1`;
 const tags=`<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<link rel="canonical" href="${escape(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bankeiz">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(canonical)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1730">
<meta property="og:image:height" content="909">
<meta property="og:image:alt" content="${escape([text.amount,text.title,text.parties,text.time].filter(Boolean).join(' · '))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(image)}">
<meta name="twitter:image:alt" content="${escape(text.amount+' · '+text.title)}">`;
 return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'')
  .replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|robots|referrer|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,'')
  .replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi,'')
  .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<\/head>/i,tags+'\n</head>');
}
export async function handleReceiptPreview(request:Request,deps?:PreviewDependencies):Promise<Response>{
 const headers=new Headers({'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
 if(!['GET','HEAD'].includes(request.method)){headers.set('Allow','GET, HEAD');return new Response(null,{status:405,headers});}
 let receipt:LedgerReceipt,packet:string,image:boolean;
 try{
  const url=new URL(request.url);
  if(!['/receipt/','/api/receipt'].includes(url.pathname)||url.hash||[...url.searchParams.keys()].some(key=>!['r','image'].includes(key)||url.searchParams.getAll(key).length!==1)||url.searchParams.has('image')&&url.searchParams.get('image')!=='1')throw Error();
  packet=url.searchParams.get('r')??'';image=url.searchParams.get('image')==='1';
  receipt=readReceiptLink(`${BANK_PUBLIC_ORIGIN}/receipt/?r=${packet}`);
 }catch{return new Response(request.method==='HEAD'?null:'Receipt link is incomplete or unsupported.',{status:400,headers});}
 headers.set('Content-Type',image?'image/png':'text/html; charset=utf-8');
 // Metadata probes never read the template, load fonts or render an image.
 if(request.method==='HEAD')return new Response(null,{headers});
 try{
  const dependencies=deps??{
   page:async()=>(await import('node:fs/promises')).readFile('dist/receipt/index.html','utf8'),
   image:async(receipt:LedgerReceipt)=>(await import('./receipt-preview-render')).renderReceiptImage(receipt),
  };
  if(image){const bytes=await dependencies.image(receipt);headers.set('Cache-Control','public, max-age=31536000, immutable');return new Response(bytes as Uint8Array<ArrayBuffer>,{headers});}
  return new Response(receiptHtml(await dependencies.page(),receipt,`${BANK_PUBLIC_ORIGIN}/receipt/?r=${packet}`,packet),{headers});
 }catch{return new Response('Receipt preview is temporarily unavailable.',{status:503,headers});}
}
