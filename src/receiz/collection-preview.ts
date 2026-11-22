import type {ComposerAssetDraft} from '../../native/receiz/app/lib/profile/composerPreparation';

export type CollectionPreview =
 | {kind:'hidden'}
 | {kind:'cover'}
 | {kind:'blur'}
 | {kind:'clip';seconds:15|30|60;file?:File}
 | {kind:'excerpt';pages:1|3|5;file?:File};

type Draft = ComposerAssetDraft & {collectionPreview?:CollectionPreview};

export function validateCollectionPreview(draft:Draft){
 const preview=draft.collectionPreview;
 if(!preview)return;
 const policy=draft.collection;
 if(!policy?.allowOriginalDownload||!policy.originalDownloadPriceCents||draft.kind==='moment')throw Error('Set a price in Collection to lock the Original.');
 if(draft.longForm.trim()||draft.files.some(file=>file.role==='attachment'))throw Error('Keep paid text and attachments inside the Original file.');
 if(preview.kind==='cover'&&!draft.files.some(file=>file.role==='cover'))throw Error('Choose a public cover image or hide the content.');
 if(preview.kind==='blur'&&draft.kind!=='image')throw Error('Choose an image that can be blurred on this device.');
 if(preview.kind==='excerpt'&&(!['epub','pdf'].includes(draft.kind)||!(preview.file instanceof File)||preview.file.type!=='application/pdf'||!preview.file.size||preview.file.size>16*1024*1024||![1,3,5].includes(preview.pages)))throw Error('Choose a separate PDF excerpt within the selected page limit.');
 if(preview.kind==='clip'&&(!['audio','video'].includes(draft.kind)||!(preview.file instanceof File)||!preview.file.type.startsWith(draft.kind+'/')||!preview.file.size||preview.file.size>16*1024*1024||![15,30,60].includes(preview.seconds)))throw Error('Choose a playable preview clip within the selected length.');
}

async function blurPreview(file:Blob):Promise<File>{
 const url=URL.createObjectURL(file),image=new Image();
 try{
  image.src=url;
  await image.decode();
  const {naturalWidth:width,naturalHeight:height}=image;
  if(!width||!height||width*height>80_000_000)throw Error('Choose an image that can be blurred on this device.');
  const longest=Math.max(width,height),sample=document.createElement('canvas'),output=document.createElement('canvas');
  sample.width=Math.max(1,Math.round(width*10/longest));
  sample.height=Math.max(1,Math.round(height*10/longest));
  output.width=Math.max(1,Math.round(width*360/longest));
  output.height=Math.max(1,Math.round(height*360/longest));
  const low=sample.getContext('2d'),smooth=output.getContext('2d');
  if(!low||!smooth)throw Error('Choose an image that can be blurred on this device.');
  low.imageSmoothingQuality='high';
  low.drawImage(image,0,0,sample.width,sample.height);
  smooth.imageSmoothingQuality='high';
  smooth.drawImage(sample,0,0,output.width,output.height);
  const blob=await new Promise<Blob|null>(resolve=>output.toBlob(resolve,'image/png'));
  if(!blob)throw Error('Choose an image that can be blurred on this device.');
  return new File([blob],'preview.png',{type:'image/png'});
 }finally{URL.revokeObjectURL(url);}
}

async function clipDuration(file:File,kind:'audio'|'video'):Promise<number>{
 const media=document.createElement(kind),url=URL.createObjectURL(file);
 try{
  return await new Promise<number>((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Choose a playable preview clip within the selected length.')),4000);
   media.preload='metadata';
   media.onloadedmetadata=()=>{clearTimeout(timer);resolve(media.duration);};
   media.onerror=()=>{clearTimeout(timer);reject(Error('Choose a playable preview clip within the selected length.'));};
   media.src=url;
  });
 }finally{media.onloadedmetadata=null;media.onerror=null;media.removeAttribute('src');media.load();URL.revokeObjectURL(url);}
}

/** Only an explicitly selected public cover or a separate preview belongs in
 * the public files. The exact primary remains in the existing private store. */
export async function prepareLockedCollectionPreview(draft:Draft,payload:Blob|null,assertCurrent:()=>void):Promise<ComposerAssetDraft['files']>{
 validateCollectionPreview(draft);
 const selection=draft.collectionPreview!;
 if(selection.kind==='hidden')return [];
 const primary=draft.files.find(file=>file.role==='primary')!;
 if(selection.kind==='blur'){
  if(!payload)throw Error('Choose an image that can be blurred on this device.');
  return [{id:'collection-preview',role:'cover',file:await blurPreview(payload)}];
 }
 const cover=draft.files.find(file=>file.role==='cover');
 async function checkDistinct(file:File){
  if(file===primary.file)throw Error('Choose a file other than the Original for the public preview.');
  if(file.size!==primary.file.size)return;
  const selected=new Uint8Array(await file.arrayBuffer()),original=new Uint8Array(await primary.file.arrayBuffer());
  assertCurrent();
  if(selected.every((byte,index)=>byte===original[index]))throw Error('Choose a file other than the Original for the public preview.');
 }
 let publicCover:ComposerAssetDraft['files']=[];
 if(cover){
  await checkDistinct(cover.file);
  const {prepareProfileImage}=await import('./profile-image');
  publicCover=[{...cover,file:await prepareProfileImage(cover.file,'banner')}];
  assertCurrent();
 }
 if(selection.kind==='cover')return publicCover;
 const clip=selection.file!;
 await checkDistinct(clip);
 if(selection.kind==='excerpt'){
  const {PDFDocument}=await import('pdf-lib');
  const excerpt=await PDFDocument.load(await clip.arrayBuffer()).catch(()=>{throw Error('Choose a readable PDF excerpt.');});
  assertCurrent();
  if(!excerpt.getPageCount()||excerpt.getPageCount()>selection.pages)throw Error('Your PDF excerpt has more pages than the selected limit.');
  return [...publicCover,{id:'collection-excerpt',role:'attachment',attachmentRole:'appendix',file:clip}];
 }
 const duration=await clipDuration(clip,draft.kind as 'audio'|'video');
 assertCurrent();
 if(!Number.isFinite(duration)||duration<=0||duration>selection.seconds)throw Error('Your preview clip is longer than the selected limit.');
 return [...publicCover,{id:'collection-preview',role:'primary',file:clip}];
}
