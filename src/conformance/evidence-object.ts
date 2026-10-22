import {canonicalJson,sha256} from './assessment.ts';
import {verifyContractTranscript,type ContractReport} from './contract.ts';
const MAX_OBJECT_BYTES=2*1024*1024,MAX_REPORT_BYTES=1024*1024;
export type ConformanceEvidenceReport=ContractReport&{credentialHolder?:{schema:'receiz.bank.conformance-holder.v1';receizId:string}};
export interface ConformanceEvidenceObject {svg:string;digest:string;report:ConformanceEvidenceReport;verifiedReport:ContractReport;}
const validHolder=(value:unknown):value is NonNullable<ConformanceEvidenceReport['credentialHolder']>=>{
 const holder=value as ConformanceEvidenceReport['credentialHolder'];
 return !!holder&&Object.keys(holder).sort().join('|')==='receizId|schema'&&holder.schema==='receiz.bank.conformance-holder.v1'&&typeof holder.receizId==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/.test(holder.receizId);
};
const utf8=new TextEncoder();
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function encode(bytes:Uint8Array){let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}
function decode(value:string){if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('EVIDENCE_OBJECT_ENCODING_INVALID');const binary=atob(value);return Uint8Array.from(binary,c=>c.charCodeAt(0));}
async function verifiedSnapshot(input:unknown){
 const text=canonicalJson(input);if(typeof text!=='string'||utf8.encode(text).length>MAX_REPORT_BYTES)throw Error('EVIDENCE_REPORT_CAPACITY');
 const report=JSON.parse(text) as ConformanceEvidenceReport;
 if(report.credentialHolder!==undefined&&!validHolder(report.credentialHolder))throw Error('EVIDENCE_HOLDER_INVALID');
 const name=report?.implementation?.name;
 if(typeof name!=='string'||!name.trim()||name.length>160||/[\u0000-\u001f\u007f\ufffe\uffff\ud800-\udfff]/u.test(name)||report.assessmentPassed!==true||report.productionQualification!=='not-demonstrated'||report.financialActionsPerformed!==0||report.reportIsAuthority!==false)throw Error('EVIDENCE_PASSING_CONTRACT_REQUIRED');
 const verifiedReport=await verifyContractTranscript(report);
 if(!verifiedReport.assessmentPassed)throw Error('EVIDENCE_PASSING_CONTRACT_REQUIRED');
 for(const test of report.cases){const checked=verifiedReport.cases.find(c=>c.id===test.id);if(!checked||test.passed!==true||canonicalJson(test.expected)!==canonicalJson(checked.expected))throw Error('EVIDENCE_REPORT_RESULT_MISMATCH');}
 return {report,verifiedReport,text};
}
function draw(report:ConformanceEvidenceReport,digest:string,payload:string){
 const name=report.implementation.name.trim(),lines:string[]=[];let line='',units=0;
 for(const character of Array.from(name)){const width=/[\u0000-\u024f]/u.test(character)?.58:1;if(units+width>24){lines.push(line);line='';units=0;}line+=character;units+=width;}
 if(line)lines.push(line);const name1=escape(lines[0]||''),name2=escape((lines[1]||'')+(lines.length>2?'…':''));
 const n=report.cases.length,build=report.implementation.buildSha256;
 const mark=`<path d="M256 117 379 184v17H133v-17l123-67Zm0 26-75 40h150l-75-40Z" fill-rule="evenodd"/><rect x="146" y="215" width="28" height="110" rx="2"/><rect x="210" y="215" width="28" height="110" rx="2"/><rect x="274" y="215" width="28" height="110" rx="2"/><rect x="338" y="215" width="28" height="110" rx="2"/><rect x="133" y="337" width="246" height="18" rx="2"/><rect x="119" y="367" width="274" height="18" rx="3"/>`;
 const engraving=Array.from({length:9},(_,i)=>`<rect x="${24+i*2.3}" y="${24+i*2.3}" width="${1152-i*4.6}" height="${732-i*4.6}" rx="${i%2?16:3}"/>`).join('');
 const rosette=Array.from({length:48},(_,i)=>`<ellipse cx="1000" cy="383" rx="79" ry="68" transform="rotate(${i*7.5} 1000 383)"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="780" viewBox="0 0 1200 780" role="img" aria-labelledby="evidence-title evidence-description">
<title id="evidence-title">Reality-Grade Banking · Certificate of Technical Conformance</title>
<desc id="evidence-description">Passing Public integration contract. Complete independently reopenable transcript embedded. Production receiving qualification not demonstrated.</desc>
<metadata id="bankeiz-conformance-evidence" data-encoding="base64" data-sha256="${digest}">${payload}</metadata>
<defs><clipPath id="implementation-name"><rect x="88" y="336" width="750" height="82"/></clipPath></defs>
<rect width="1200" height="780" fill="#faf9f4"/>
<rect x="24" y="24" width="1152" height="732" fill="#fffefa"/>
<g fill="none" stroke="#25455e" stroke-width=".45" opacity=".35">${engraving}</g>
<rect x="48" y="48" width="1104" height="684" fill="none" stroke="#aa8c4e" stroke-width=".7"/>
<g fill="none" stroke="#aa8c4e" stroke-width=".8"><path d="M48 74V48h26M1126 48h26v26M1152 706v26h-26M74 732H48v-26"/><path d="m57 63 6-6 6 6-6 6Zm1074 0 6-6 6 6-6 6Zm0 654 6-6 6 6-6 6Zm-1074 0 6-6 6 6-6 6Z"/></g>
<g fill="#17364d" opacity=".028" transform="translate(322 150) scale(1.08)">${mark}</g>
<g fill="none" stroke="#25455e" opacity=".035" stroke-width=".7"><circle cx="600" cy="420" r="226"/><circle cx="600" cy="420" r="232"/><path d="M334 420h532M600 154v532"/></g>
<g fill="#19364d" transform="translate(561 59) scale(.153)">${mark}</g>
<g fill="#19364d" font-family="Arial,Helvetica,sans-serif">
<text x="600" y="153" text-anchor="middle" font-size="10" letter-spacing="3.2" fill="#6c7a83">CERTIFICATE OF TECHNICAL CONFORMANCE</text>
<text x="600" y="213" text-anchor="middle" font-family="Georgia,Times New Roman,serif" font-size="47" letter-spacing="-.8">Reality-Grade Banking</text>
<text x="600" y="250" text-anchor="middle" font-size="18" letter-spacing=".5">Public integration contract</text>
<g fill="none" stroke="#aa8c4e" stroke-width=".7"><path d="M88 281h466m92 0h466"/><path d="m588 281 12-4 12 4-12 4Z"/></g>
<text x="88" y="324" font-size="10" letter-spacing="2.2" fill="#6c7a83">${report.credentialHolder?'CREDENTIAL HOLDER · RECEIZ ID':'ASSESSED IMPLEMENTATION'}</text>
${report.credentialHolder?`<text x="88" y="371" font-family="monospace" font-size="${report.credentialHolder.receizId.length>64?10:report.credentialHolder.receizId.length>40?15:23}"${report.credentialHolder.receizId.length>96?' textLength="740" lengthAdjust="spacingAndGlyphs"':''}>${escape(report.credentialHolder.receizId)}</text><text x="88" y="418" font-size="10" letter-spacing="1.5" fill="#6c7a83">ASSESSED IMPLEMENTATION</text><text x="88" y="442" font-size="14"><title>${escape(name)}</title>${name1}${name2?'…':''}</text>`:`<g clip-path="url(#implementation-name)"><title>${escape(name)}</title><text x="88" y="367" font-family="Georgia,Times New Roman,serif" font-size="29">${name1}</text>${name2?`<text x="88" y="404" font-family="Georgia,Times New Roman,serif" font-size="29">${name2}</text>`:''}</g><text x="88" y="440" font-size="12" fill="#6c7a83">Identity bound on issuance · Complete test observations retained</text>`}
<path d="M872 313v137" stroke="#b7b5a7" stroke-width=".6"/>
<g fill="none" stroke="#aa8c4e" stroke-width=".45" opacity=".36">${rosette}</g>
<circle cx="1000" cy="383" r="65" fill="#fffefa" stroke="#aa8c4e" stroke-width=".7"/>
<circle cx="1000" cy="383" r="60" fill="none" stroke="#19364d" stroke-opacity=".35" stroke-width=".5"/>
<text x="1000" y="359" text-anchor="middle" font-size="8" letter-spacing="1.8" fill="#6c7a83">CONTRACT CASES</text>
<text x="1000" y="398" text-anchor="middle" font-family="Georgia,Times New Roman,serif" font-size="35">${n} / ${n}</text>
<text x="1000" y="422" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="#6c7a83">PASSED</text>
<path d="M88 474h1024" stroke="#b7b5a7" stroke-width=".6"/>
<text x="88" y="507" font-size="10" letter-spacing="1.5" fill="#6c7a83">IMPLEMENTATION BUILD · SHA-256</text>
<text x="88" y="535" font-family="monospace" font-size="16">${build}</text>
<text x="88" y="576" font-size="10" letter-spacing="1.5" fill="#6c7a83">COMPLETE EVIDENCE · SHA-256</text>
<text x="88" y="604" font-family="monospace" font-size="16">${digest}</text>
<path d="M88 633h1024" stroke="#aa8c4e" stroke-width=".7"/>
<text x="88" y="665" font-size="12" fill="#526777">Complete transcript embedded · Reopen at bankeiz.com/conformance/#assess</text>
<text x="88" y="691" font-size="12" fill="#526777">Production receiving qualification not demonstrated</text>
<text x="1112" y="709" text-anchor="end" font-size="8" letter-spacing="1.6" fill="#7b807e">PUBLIC INTEGRATION CONTRACT · v1</text>
</g>
</svg>`;
}
export async function createConformanceEvidenceObject(input:unknown):Promise<ConformanceEvidenceObject>{
 const {report,verifiedReport,text}=await verifiedSnapshot(input),bytes=utf8.encode(text),digest=await sha256(bytes),svg=draw(report,digest,encode(bytes));
 if(utf8.encode(svg).length>MAX_OBJECT_BYTES)throw Error('EVIDENCE_OBJECT_CAPACITY');return {svg,digest,report,verifiedReport};
}
/** Only the canonical sealing boundary may attest this declaration by matching
 * it to the admitted owner and the resulting native ownership continuity. */
export async function bindConformanceEvidenceHolder(object:ConformanceEvidenceObject,receizId:string):Promise<ConformanceEvidenceObject>{
 const holder={schema:'receiz.bank.conformance-holder.v1' as const,receizId};
 if(!validHolder(holder))throw Error('EVIDENCE_HOLDER_INVALID');
 const original=await openConformanceEvidenceObject(object.svg);
 if(original.report.credentialHolder&&original.report.credentialHolder.receizId!==receizId)throw Error('EVIDENCE_HOLDER_MISMATCH');
 return createConformanceEvidenceObject({...original.report,credentialHolder:holder});
}
export async function openConformanceEvidenceObject(source:string):Promise<ConformanceEvidenceObject>{
 if(typeof source!=='string'||utf8.encode(source).length>MAX_OBJECT_BYTES)throw Error('EVIDENCE_OBJECT_CAPACITY');
 // Never execute or attach supplied XML. Only accept the exact passive drawing
 // regenerated below from a hash-bound, independently replayed transcript.
 const matches=[...source.matchAll(/<metadata id="bankeiz-conformance-evidence" data-encoding="base64" data-sha256="([a-f0-9]{64})">([A-Za-z0-9+/=]+)<\/metadata>/g)];
 if(matches.length!==1)throw Error('EVIDENCE_OBJECT_METADATA_REQUIRED');
 const [,digest,payload]=matches[0],bytes=decode(payload);
 if(bytes.length>MAX_REPORT_BYTES||await sha256(bytes)!==digest)throw Error('EVIDENCE_OBJECT_DIGEST_MISMATCH');
 const report:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 const object=await createConformanceEvidenceObject(report);
 if(source!==object.svg)throw Error('EVIDENCE_OBJECT_DRAWING_MISMATCH');return object;
}
export async function downloadConformanceEvidenceObject(object:ConformanceEvidenceObject){
 const verified=await openConformanceEvidenceObject(object.svg),url=URL.createObjectURL(new Blob([verified.svg],{type:'image/svg+xml'}));
 const link=document.createElement('a');link.href=url;link.download=`bankeiz-conformance-evidence-${verified.digest.slice(0,12)}.svg`;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
