/** Prepare an explicitly chosen photo locally for the existing Receiz image
 * pipeline. No work or image transfer occurs before the file picker is used. */
export async function prepareProfileImage(file:File,kind:'avatar'|'banner'):Promise<File>{
 if(!file.type.startsWith('image/')||file.size<=0||file.size>14*1024*1024)throw Error('Choose an image smaller than 14 MB.');
 const url=URL.createObjectURL(file),image=new Image();image.decoding='async';
 try{
  image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>80_000_000)throw Error('Choose a smaller image.');
  const max=kind==='avatar'?1024:2048,scale=Math.min(1,max/image.naturalWidth,max/image.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext('2d');if(!context)throw Error('This image could not be prepared.');context.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.9,.8,.68]){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=3_500_000)return new File([blob],'profile.'+(blob.type==='image/webp'?'webp':'png'),{type:blob.type});}
  throw Error('Choose a smaller image.');
 }finally{URL.revokeObjectURL(url);image.src='';}
}
