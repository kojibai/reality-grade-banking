import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import fontkit, {type Font} from '@pdf-lib/fontkit';
import {Resvg} from '@resvg/resvg-js';
import {bankMarkPaths} from '../branding/bank-mark.mjs';

export type GovernanceCardData = Readonly<{
  title:string; kind:string; charter:string; description:string; digest:string; example:boolean;
}>;

const serif=resolve('public/conformance/fonts/NotoSerif-Regular.ttf');
const sans=resolve('scripts/social/fonts/Inter-Regular.ttf');
const semibold=resolve('scripts/social/fonts/Inter-SemiBold.ttf');
const font={fontFiles:[serif,sans,semibold],loadSystemFonts:true,defaultFontFamily:'Inter'};
const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
const metrics=new Map<string,Font>();
const textWidth=684;
function clean(value:string,max:number){
  return value.slice(0,max*4).replace(/[\uD800-\uDFFF]/gu,'�').normalize('NFC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu,' ').replace(/\s+/gu,' ').trim();
}
const escape=(s:string)=>s.replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function width(text:string,size:number,path:string){
  let face=metrics.get(path);
  if(!face){face=fontkit.create(readFileSync(path));metrics.set(path,face);}
  const run=face.layout(text);
  // Other scripts may select a system fallback whose advance is wider.
  const missing=run.glyphs.filter(glyph=>glyph.id===0).length;
  return size*(run.advanceWidth/face.unitsPerEm+missing*.6);
}
function wrap(value:string,size:number,path:string,limit:number,ellipsis=false){
  let rest=[...segmenter.segment(value)].map(part=>part.segment);
  const lines:string[]=[];
  while(rest.length&&lines.length<limit){
    const last=lines.length===limit-1;
    const fits=(n:number)=>width(rest.slice(0,n).join('').trimEnd()+(last&&ellipsis&&n<rest.length?'…':''),size,path)<=textWidth;
    let lo=1,hi=rest.length;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fits(mid))lo=mid;else hi=mid-1;}
    let end=lo;
    if(lo<rest.length&&!/^\s$/u.test(rest[lo])){
      const space=rest.slice(0,lo).lastIndexOf(' ');
      if(space>0)end=space;
    }
    const suffix=last&&ellipsis&&end<rest.length?'…':'';
    lines.push(rest.slice(0,end).join('').trimEnd()+suffix);
    rest=rest.slice(end);while(rest[0]===' ')rest.shift();
  }
  return {lines,complete:rest.length===0};
}

function point(radius:number,degrees:number){
  const angle=degrees*Math.PI/180;
  return (radius*Math.cos(angle)).toFixed(2)+' '+(radius*Math.sin(angle)).toFixed(2);
}
function arc(radius:number,start:number,end:number){
  return 'M'+point(radius,start)+' A'+radius+' '+radius+' 0 '+(end-start>180?1:0)+' 1 '+point(radius,end);
}
// A plan view of a debating chamber: stepped galleries, radial aisles and a rostrum.
function chamber(){
  const tiers:string[]=[];
  for(const radius of [56,86,116,146,176]){
    for(const [start,end] of [[181,219],[225,265],[275,315],[321,359]]){
      const inner=radius-13;
      tiers.push('<path d="'+arc(radius,start,end)+' L'+point(inner,end)+' A'+inner+' '+inner+' 0 0 0 '+point(inner,start)+' Z" fill="url(#silver)" stroke="#d5e4fa" stroke-width=".8"/>');
      tiers.push('<path d="'+arc(radius-5,start+1,end-1)+'" stroke="#385589" stroke-width="1.1" fill="none"/>');
    }
  }
  const ticks=Array.from({length:96},(_,i)=>{
    const start=i%8===0?198:202;
    return '<path d="M'+point(start,i*3.75)+' L'+point(206,i*3.75)+'"/>';
  }).join('');
  return '<g transform="translate(1007 318)"><g stroke="#8197b8" fill="none"><circle r="208"/><circle r="192" stroke-opacity=".64"/><g stroke-width=".9">'+ticks+'</g></g>'+
    '<g transform="translate(0 46)">'+tiers.join('')+
    '<path d="M-173 8H-36M36 8H173M-158 14H-40M40 14H158" fill="none" stroke="#bad0f6"/>'+
    '<path d="M-30 4H30V18H-30ZM-21 19H21V27H-21Z" fill="url(#silver)"/>'+
    '<path d="M-104 42Q0 116 104 42M-110 51Q0 127 110 51" stroke="#8aa4cc" fill="none"/>'+
    '</g></g>';
}

export function renderGovernanceCard(data:GovernanceCardData):Uint8Array {
  const title=clean(data.title,240)||'Public voting';
  const charter=clean(data.charter,160),description=clean(data.description,600);
  const kind=clean(data.kind,48)||'Governance';
  const fontSizes=[73,62,51];
  let size=fontSizes[0],lines:string[]=[];
  for(const candidate of fontSizes){
    size=candidate;
    const set=wrap(title,size,serif,3,candidate===fontSizes.at(-1));
    lines=set.lines;if(set.complete)break;
  }
  const headingY=200,step=size*1.16;
  const summaryY=Math.max(350,headingY+(lines.length-1)*step+56);
  const summary=description&&description!==title?wrap(description,24,sans,summaryY<410?2:1,true).lines:[];
  const org=charter&&charter!==title?wrap(charter,23,semibold,1,true).lines[0]:'';
  const digest=/^[a-f0-9]{64}$/iu.test(data.digest)?data.digest.toLowerCase():'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="paper" x2=".8" y2="1"><stop stop-color="#fcfbf8"/><stop offset="1" stop-color="#edf1f7"/></linearGradient>
      <linearGradient id="field" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#244d89"/><stop offset=".52" stop-color="#172b45"/><stop offset="1" stop-color="#11243b"/></linearGradient>
      <linearGradient id="silver" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#e6efff"/><stop offset=".45" stop-color="#a7c0ee"/><stop offset="1" stop-color="#83a1da"/></linearGradient>
      <pattern id="paper-rule" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#3f568a" stroke-width=".3" opacity=".12"/></pattern>
      <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#aac3ed" stroke-width=".6" opacity=".14"/></pattern>
      <clipPath id="plate"><rect x="790" width="410" height="630"/></clipPath>
    </defs>
    <rect width="1200" height="630" fill="url(#paper)"/><rect width="790" height="630" fill="url(#paper-rule)"/>
    <g clip-path="url(#plate)"><rect x="790" width="410" height="630" fill="url(#field)"/><rect x="790" width="410" height="630" fill="url(#grid)"/>
      <g stroke="#a4b7d6" stroke-opacity=".23" fill="none"><circle cx="1007" cy="318" r="254"/><circle cx="1007" cy="318" r="260"/><path d="M790 318H1200M1007 0V630"/></g>
      ${chamber()}
    </g>
    <path d="M791 0V630" stroke="#244dcb" stroke-width="4"/>
    <svg x="54" y="39" width="41" height="41" viewBox="112 112 288 288" fill="#172b45">${bankMarkPaths}</svg>
    <g font-family="Inter" fill="#172b45"><text x="108" y="69" font-size="26" font-weight="600">Bankeiz</text><path d="M220 46V70" stroke="#ccd5e3"/><text x="238" y="67" font-size="20">Public voting</text></g>
    <path d="M56 100H733" stroke="#c6cfdc"/>
    <text x="56" y="143" font-family="Inter" font-size="16" font-weight="600" letter-spacing="2" fill="#244dcb">${escape(kind.toUpperCase())}${data.example?'  ·  EXAMPLE':''}</text>
    <g font-family="Noto Serif" font-size="${size}" fill="#172b45">${lines.map((line,i)=>`<text x="52" y="${headingY+24+i*step}">${escape(line)}</text>`).join('')}</g>
    <g fill="#56677b" font-family="Inter" font-size="24">${summary.map((line,i)=>`<text x="56" y="${summaryY+24+33*i}">${escape(line)}</text>`).join('')}</g>
    ${org||digest?'<path d="M56 510H733" stroke="#c6cfdc"/>':''}
    <g font-family="Inter" fill="#273d58">${org?`<text x="56" y="551" font-weight="600" font-size="23">${escape(org)}</text>`:''}
    ${digest?`<text x="56" y="${org?590:558}" font-size="18">Original · ${digest.slice(0,12)}…${digest.slice(-10)}</text>`:''}</g>
  </svg>`;
  return new Resvg(svg,{font}).render().asPng();
}
