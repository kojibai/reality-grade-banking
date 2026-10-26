// Source-bound, unissued illustration. No identity, proof or financial operation.
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Resvg} from '@resvg/resvg-js';
import sharp from 'sharp';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const {OfflineNotePreview}=await server.ssrLoadModule('/src/features/notes/OfflineNotePreview.tsx');
 let svg=renderToStaticMarkup(createElement(OfflineNotePreview,{amount:'100.00',rail:'composite'})).match(/<svg\b[\s\S]*<\/svg>/)[0].replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
 for(const src of new Set([...svg.matchAll(/href="(\/notes\/[^"<>]+)"/g)].map(match=>match[1]))){const source=await readFile('public'+src),png=src.endsWith('.png')?source:await sharp(source).png().toBuffer();svg=svg.replaceAll('href="'+src+'"','href="data:image/png;base64,'+png.toString('base64')+'"');}
 svg=svg.replace('</g></svg>','<text x="258" y="375" text-anchor="middle" font-size="10" letter-spacing="2">SPECIMEN · NOT ISSUED</text></g></svg>');
 const png=new Resvg(svg,{fitTo:{mode:'width',value:1620},font:{fontFiles:['public/notes/fonts/Cinzel.ttf'],loadSystemFonts:false,defaultFontFamily:'Cinzel'}}).render().asPng();
 const bytes=await sharp(png).webp({quality:88,effort:6}).toBuffer(),file='public/learn/settlement-note.webp';
 if(process.argv.includes('--check')){if(!(await readFile(file)).equals(bytes))throw Error('SETTLEMENT_NOTE_SPECIMEN_OUT_OF_DATE');}else await writeFile(file,bytes);
 console.log('Verified one unissued Settlement Note specimen from the production preview; no proof payload or financial effect.');
}finally{await server.close();}
