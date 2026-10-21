import {cp,mkdir} from 'node:fs/promises';
for(const directory of ['cmaps','standard_fonts','wasm']){await mkdir('public/pdf-runtime',{recursive:true});await cp(`node_modules/pdfjs-dist/${directory}`,`public/pdf-runtime/${directory}`,{recursive:true});}
console.log('Prepared local PDF fonts, character maps and image decoders. Requested only by documents that need them.');
