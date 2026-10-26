import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {publicIllustrations} from '../src/content/public-imagery.mjs';
const check=process.argv.includes('--check'),images=[];
for(const image of publicIllustrations){
 const path='public'+image.src,bytes=await readFile(path),metadata=await sharp(bytes).metadata();
 if(metadata.width!==image.width||metadata.height!==image.height||!metadata.hasAlpha||bytes.length>120000)throw Error('PUBLIC_ILLUSTRATION_FORMAT:'+image.key);
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(const index of [3,info.width*4-1,(info.height-1)*info.width*4+3,info.width*info.height*4-1])if(data[index]!==0)throw Error('PUBLIC_ILLUSTRATION_BACKGROUND:'+image.key);
 const variants=[];for(const width of [384,640]){const rendered=await sharp(bytes).resize({width,withoutEnlargement:true}).webp({quality:84,alphaQuality:90}).toBuffer(),target=path.replace('.webp',`-${width}.webp`);
  if(check){if(!(await readFile(target)).equals(rendered))throw Error('PUBLIC_ILLUSTRATION_VARIANT_OUT_OF_DATE:'+image.key);}else await writeFile(target,rendered);
  variants.push({src:target.slice(6),width,bytes:rendered.length,sha256:createHash('sha256').update(rendered).digest('hex')});
 }
 images.push({...image,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),variants});
}
const result=JSON.stringify({schema:'bankeiz.public-illustrations.v1',notice:'Presentation only; these illustrations carry no identity, proof admission, custody, funds or execution authority.',images},null,2)+'\n',path='public/art/illustrations.json';
if(check){if(await readFile(path,'utf8')!==result)throw Error('PUBLIC_ILLUSTRATION_MANIFEST_OUT_OF_DATE');}else await writeFile(path,result);
console.log(`${check?'Verified':'Built'} ${images.length} transparent public scenes and ${images.length*2} responsive variants.`);
