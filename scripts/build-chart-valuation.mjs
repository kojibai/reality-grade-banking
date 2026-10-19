import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';
const path=new URL('../node_modules/@receiz/sdk/dist/sigilValuationCore.js',import.meta.url),source=await readFile(path,'utf8');
const start=source.indexOf('    const stampPayload = stableStringify({',source.indexOf('export function computeIntrinsicUnsigned('));
if(start<0||!source.endsWith('}\n')||!source.includes('    const unsignedRaw = {'))throw Error('SDK valuation source changed; review the chart evaluator generator.');
// Only observation work is omitted: the complete arithmetic and unsigned output
// above this marker are copied byte-for-byte from the installed SDK. The public
// inspector continues to use the SDK function with its full calculation trace.
const arithmetic=(source.slice(0,start)+'    return unsignedRaw;\n}\n').replace(/(?<!function )\brecordCalculation\(/g,'/* @__PURE__ */recordCalculation(');
const result=await transform(arithmetic,{loader:'js',format:'esm',target:'es2022',minifySyntax:true,treeShaking:true,pure:['recordCalculation']});
if(/(?<!function )recordCalculation\(/.test(result.code))throw Error('Chart tracing was not removed.');
const hash=createHash('sha256').update(source).digest('hex');
const output='// Generated from @receiz/sdk 129.0.0 sigilValuationCore.js; do not edit.\n// SDK source SHA-256: '+hash+'\n// Same unsigned arithmetic; calculation tracing and reference memoization omitted for chart sampling.\n'+result.code;
const target=new URL('../src/receiz/generated/chart-valuation.mjs',import.meta.url);await mkdir(new URL('.',target),{recursive:true});
if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==output)throw Error('Chart evaluator differs from the installed SDK. Run node scripts/build-chart-valuation.mjs and review parity tests.');}else await writeFile(target,output);
