import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Resvg} from '@resvg/resvg-js';
import {publicPages} from './public-page-metadata.mjs';
import {shareCardSvg} from './social/share-card-art.mjs';
import {businessFits} from '../src/content/business-fits.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),check=process.argv.includes('--check'),root=new URL('../public/social/',import.meta.url);
await mkdir(root,{recursive:true});
const images={};
for(const page of publicPages){
 const home=page.path==='/',bytes=home?await readFile(new URL('../public/receiz-bank-share.png',import.meta.url)):new Resvg(shareCardSvg(page),{font:{fontFiles:['Inter-Regular.ttf','Inter-SemiBold.ttf'].map(file=>new URL('./social/fonts/'+file,import.meta.url).pathname),loadSystemFonts:false,defaultFontFamily:'Inter'}}).render().asPng();
 const digest=sha(bytes),filename=`${page.id}-${digest.slice(0,16)}.png`,url='/social/'+filename;
 if(check){if(!(await readFile(new URL(filename,root))).equals(bytes))throw Error('SOCIAL_IMAGE_OUT_OF_DATE:'+page.id);}else await writeFile(new URL(filename,root),bytes);
 images[page.path]={url,width:1730,height:909,sha256:digest,bytes:bytes.length,alt:page.id==='identity-continuity'?'A different app. The same you. Two independent applications, Receiz and Bankeiz, display the same representative Receiz ID in a silver and blue illustrative continuity diagram.':page.id==='your-twin'||page.id==='in-action'?'Your Twin connects a visitor’s question and answer to the owner’s shared contact details, conversation context and confirmed calendar appointment. Illustrative workflow.':page.id==='together'||page.id.startsWith('together-')?page.lines.join(' ')+' An original, its source and willing participants remain connected through a proof-native exchange. Illustrative process.':page.id.startsWith('business-fit-')?`${page.lines.join(' ')} ${businessFits.find(fit=>page.id==='business-fit-'+fit.slug).visualLabels.join(' → ')}. Illustrative workflow.`:home?'Bankeiz. Your value. More possibilities. Layered blue and glass forms on warm white.':page.id==='protect-your-value'?'Prove it’s yours. Keep it yours. A separate passkey, private Vault and public proof illustrate keeping evidence separate from access.':page.id.startsWith('cooperatives')?`${page.title} Real goods and work connect to defined rights, original proof and the next willing participant. Illustrative exchange.`:`Bankeiz. ${page.lines.join(' ')} ${page.caption} An engraved ${page.motif} motif on layered cobalt, clear glass and navy forms.`};
}
const manifest=JSON.stringify({schema:'bankeiz.public-social-images.v1',images},null,2)+'\n',file=new URL('manifest.json',root);
if(check){if(await readFile(file,'utf8')!==manifest)throw Error('SOCIAL_IMAGE_MANIFEST_OUT_OF_DATE');}
else{await writeFile(file,manifest);const keep=new Set(Object.values(images).map(image=>image.url.split('/').at(-1)));for(const name of await readdir(root))if(/^[a-z-]+-[a-f0-9]{16}\.png$/.test(name)&&!keep.has(name))await unlink(new URL(name,root));}
console.log(`${check?'Verified':'Generated'} ${publicPages.length} unique public sharing images. Public metadata only; excluded from app preload and PWA precache.`);
