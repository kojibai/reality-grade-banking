// Public illustration mapping only. These files are never proof or financial sources.
const scene=(key,alt)=>Object.freeze({key,src:`/art/${key}.webp`,width:1024,height:896,alt:'Illustration: '+alt});
export const publicIllustrations=Object.freeze([
 scene('deposit-source','a Bitcoin source remains connected to a glass and cobalt proof object.'),
 scene('proof-nft','a collectible original and a portable proof object keep their source relationship.'),
 scene('proof-transfer','two proof objects remain connected through one transfer and its source layers.'),
 scene('proof-vault','an original inside a private Vault remains separate from the passkey outside it.'),
 scene('proof-cooperative','productive goods and useful work connect to one proof object.'),
 scene('proof-identity','one sealed identity original connects across two different application portals.'),
 scene('proof-record','a source Original, its connected history layers and an inspection lens.'),
 scene('proof-assets','a shoe, property and original work connect to a sealed proof object.'),
 scene('proof-money','incoming and outgoing records connect to one native proof object and its context.'),
 scene('proof-network','one portable Original remains connected across places and compatible experiences.'),
 scene('proof-market','defined ownership slices remain connected to the whole and its source.'),
]);
const byKey=new Map(publicIllustrations.map(scene=>[scene.key,scene]));
export function publicIllustration(page){
 if(!page||page.kind==='account-notice')return null;
 const path=page.path??'',slug=page.slug??'',key=page.key??'',text=(slug+' '+key+' '+(page.title??'')).toLowerCase();
 if(['/','/verify/','/ledger/','/receipt/','/explore/','/schemas/','/legal/','/fit/','/learn/guides/'].includes(path)||/^\/(?:vault|u)\//.test(path)||['guides','fit'].includes(slug)||page.bankingWalkthrough||page.twinSales&&key==='in-action')return null;
 const get=key=>byKey.get(key);
 if(page.portability||/^\/(?:crypto|nfts)\//.test(path))return get(key==='nfts'||slug==='nfts'?'proof-nft':'deposit-source');
 if(/(?:protect|security|signing-key|vault|fraud|recover|privacy)/.test(text))return get('proof-vault');
 if(/(?:receiz-id|identity|\bpbi\b|account-access)/.test(text)||page.identityContinuity)return get('proof-identity');
 if(page.fit||slug==='business'||page.twinSales||page.outcome&&key==='agent')return get('proof-money');
 if(/(?:housing|physical-assets|rights-and-backing|intellectual|creators|workers)/.test(text))return get('proof-assets');
 if(page.economy||page.cooperativeKind||page.together||/cooperative|communit|farmers|grocers|fuel|repairs/.test(text))return get('proof-cooperative');
 if(/(?:global|offline|infrastructure|platform|institution|interoper|cross-border|together)/.test(text))return get('proof-network');
 if(page.group==='History'||/receipt|provenance|source-of-funds|ordering|proof|verification|conformance/.test(text))return get('proof-record');
 if(page.group==='Markets'||/market|fraction|ownership|invest|valuation|capitalization/.test(text))return get('proof-market');
 if(page.group==='Assets'||/asset|moment|original/.test(text))return get('proof-assets');
 if(page.group==='Standards'||page.standard)return get('proof-record');
 if(!path&&!slug&&!page.group)return null;
 return get('proof-transfer');
}
