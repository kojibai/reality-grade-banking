import {expect,it} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import {prepareLockedCollectionPreview} from '../src/receiz/collection-preview';
import {composerDraftWithLink,type AssetComposerDraft} from '../src/receiz/asset-composer';
import {parsePublicMarket} from '../src/receiz/public-market';
import {createHeldPublicMarketInput} from '../src/receiz/public-market-held-catalog';
import {publicOriginalCheckoutUrl} from '../src/receiz/public-original-purchase';
import {curatePublicMarketMembership} from '../server/public-market';

const policy={allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:false,originalDownloadLimit:null,derivativeDownloadLimit:null,originalDownloadPriceCents:125,derivativeDownloadPriceCents:null};
const primary=new File(['exact private original'],'original.pdf',{type:'application/pdf'});
const draft:AssetComposerDraft={title:'An Original',description:'Its public caption',longForm:'',kind:'pdf',collection:policy,files:[{id:'primary',role:'primary',file:primary}]};
it('keeps the opt-in through native form validation and refuses a price-free lock or public full text',async()=>{
 const selected=composerDraftWithLink({...draft,collectionPreview:{kind:'hidden'}});
 expect(await prepareLockedCollectionPreview(selected,primary,()=>{})).toEqual([]);
 expect(()=>composerDraftWithLink({...selected,collection:{...policy,originalDownloadPriceCents:null}})).toThrow('Set a price');
 expect(()=>composerDraftWithLink({...selected,longForm:'The entire book'})).toThrow('Keep paid text');
 const alias=new File([primary],'renamed.pdf',{type:primary.type});
 await expect(prepareLockedCollectionPreview({...draft,collectionPreview:{kind:'excerpt',pages:3,file:alias}},primary,()=>{})).rejects.toThrow('Choose a file other than the Original');
});

it('carries only a separately selected PDF excerpt within the page limit',async()=>{
 const pdf=await PDFDocument.create();pdf.addPage();pdf.addPage();
 const file=new File([new Uint8Array(await pdf.save())],'excerpt.pdf',{type:'application/pdf'});
 const choice={...draft,collectionPreview:{kind:'excerpt' as const,pages:1 as const,file}};
 await expect(prepareLockedCollectionPreview(choice,primary,()=>{})).rejects.toThrow('has more pages');
 const files=await prepareLockedCollectionPreview({...choice,collectionPreview:{...choice.collectionPreview,pages:3}},primary,()=>{});
 expect(files).toEqual([{id:'collection-excerpt',role:'attachment',attachmentRole:'appendix',file}]);
});

it('keeps a selected purchase offer across repeated curation and cold held catalog read',()=>{
 const assetId='imported-'+'a'.repeat(64),sourceUrl='https://receiz.com/artist/verified/'+assetId;
 const fixture={ok:true,transport:{generatedAt:null,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'preview-lineage'},publicOriginals:[{
  id:'profile:artist:'+assetId,receizId:assetId,title:'Original',canonicalHref:sourceUrl,ownerUsername:'artist',
  profileOriginal:{importedSource:{protectedOriginal:true},media:{...policy,kind:'image',src:'',originalDownloadSrc:'/api/profile/originals/download?receizId='+assetId+'&kind=original'}}
 }]}};
 const first=JSON.parse(JSON.stringify(curatePublicMarketMembership(structuredClone(fixture))));
 expect(JSON.parse(JSON.stringify(curatePublicMarketMembership(structuredClone(first))))).toEqual(first);
 const catalog=parsePublicMarket(first),item=catalog.items[0]!;
 expect(item.originalOffer).toEqual({amountCents:125,locked:true});
 const held=createHeldPublicMarketInput(catalog);expect(held).not.toBeNull();
 expect(parsePublicMarket(JSON.parse(JSON.stringify(held))).items[0]?.originalOffer).toEqual(item.originalOffer);
 expect(publicOriginalCheckoutUrl(item.sourceUrl,item.assetId)).toBe('/pay/artist/?original='+assetId);
 expect(publicOriginalCheckoutUrl('https://example.com/artist/verified/'+assetId,assetId)).toBeNull();
 expect(publicOriginalCheckoutUrl(sourceUrl,'another-asset')).toBeNull();
 fixture.transport.publicOriginals[0]!.profileOriginal.media.src='/preview.webp';
 expect(parsePublicMarket(fixture).items[0]?.originalOffer).toEqual({amountCents:125,locked:false});
});
