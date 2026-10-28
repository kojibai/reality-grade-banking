/** Private download transport only. The supplied meeting is the exact verified
 * file from MeetingCapture; extracted contents never replace that proof. The
 * Identity Record is copied exactly, separately, and never resealed or shared. */
export async function buildMeetingDownload(input:{meeting:File;title:string;identity:{bytes:Uint8Array;filename:string;phrase:string}}):Promise<File>{
 if(!input.identity.bytes.length||!input.identity.filename)throw Error('MEETING_DOWNLOAD_IDENTITY_REQUIRED');
 const safePath=(path:string)=>!!path&&!path.startsWith('/')&&!path.includes('\\')&&!/[\u0000-\u001f]/.test(path)&&path.split('/').every(part=>part!=='.'&&part!=='..'&&part!=='');
 if(!safePath(input.meeting.name)||input.meeting.name.includes('/')||!safePath(input.identity.filename)||input.identity.filename.includes('/'))throw Error('MEETING_DOWNLOAD_PATH_INVALID');
 const {unzip,zip,strToU8}=await import('fflate');
 const original=new Uint8Array(await input.meeting.arrayBuffer());
 const contents=await new Promise<Record<string,Uint8Array>>((resolve,reject)=>unzip(original,(error,files)=>error?reject(error):resolve(files)));
 const title=input.title.replace(/[^\p{L}\p{N} _.-]/gu,' ').replace(/\s+/g,' ').trim().replace(/^\.+|\.+$/g,'').slice(0,80)||'Meeting';
 const folder='Meeting - '+title,files:Record<string,Uint8Array>={};
 for(const [path,bytes]of Object.entries(contents)){
  if(path.endsWith('/'))continue;
  if(!safePath(path))throw Error('MEETING_DOWNLOAD_PATH_INVALID');
  files[folder+'/Meeting/'+path]=bytes;
 }
 if(!Object.keys(files).length)throw Error('MEETING_DOWNLOAD_SOURCE_EMPTY');
 files[folder+'/Proof/'+input.meeting.name]=original;
 files[folder+'/Identity/'+input.identity.filename]=new Uint8Array(input.identity.bytes);
 files[folder+'/Read me.txt']=strToU8([
  input.title,'',
  'Meeting: open the Meeting folder for the conversation record and any recorded audio/video. Only captured intervals are included.',
  'Proof: the exact sealed meeting original is in the Proof folder. Its carried evidence remains the source for verification.',
  'Identity: your existing Receiz Identity Record is in the Identity folder. Keep this private; use it to return to your account on another device.',
  'If your Identity Record uses an unlock phrase, keep that phrase separately. It is not included here.',
  'This folder is for you. Share the meeting files you choose; keep the Identity folder private.',
 ].join('\n'));
 const bytes=await new Promise<Uint8Array>((resolve,reject)=>zip(files,{level:0},(error,value)=>error?reject(error):resolve(value)));
 return new File([new Uint8Array(bytes)],folder+'.zip',{type:'application/zip'});
}

/** Same browser download mechanism as held Originals. Attach before clicking,
 * retain the URL long enough for the browser, and leave explicit retry to UI. */
export function downloadMeetingFile(file:File):void{
 const url=URL.createObjectURL(file),link=document.createElement('a');
 try{link.href=url;link.download=file.name;link.hidden=true;document.body.append(link);link.click();}
 finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);}
}
