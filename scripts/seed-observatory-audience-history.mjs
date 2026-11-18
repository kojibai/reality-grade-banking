// Refresh the bundled anonymous history offline from the two existing public releases.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const bank=fileURLToPath(new URL('../',import.meta.url));
const receiz=process.argv[2];
if(!receiz)throw Error('Pass the Receiz source checkout containing the public Showcase releases.');
const readGit=(root,args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:128*1024*1024});
const versions=(root,path)=>readGit(root,['log','--reverse','--format=%H','HEAD','--',path]).trim().split(/\s+/).filter(Boolean);
const atVersion=(root,hash,path)=>JSON.parse(readGit(root,['show',hash+':'+path]));
const fields={views:'originalViews',plays:'streams',seconds:'witnessedSeconds'};
const directory=JSON.parse(await readFile(new URL('../src/observatory/public-directory.json',import.meta.url),'utf8'));
const publicCards=new Map(directory.cards.map(card=>[card.userId,card.username]));
const observations=new Map();
function add(stamp,heads,source,publication,path){
  if(!Number.isFinite(Date.parse(stamp)))return;
  const at=new Date(stamp).toISOString();
  const rows=new Map();
  for(const head of heads){
    const id=head?.profile?.userId;
    if(!id||publicCards.get(id)!==head.profile.username||head.profile.isPrivate!==false||head.viewer?.canView!==true||head.unavailableDecorators?.some(k=>k==='engagement'||k==='profile-details'))continue;
    const reading={};
    for(const [metric,field] of Object.entries(fields)){
      const value=head.stats?.[field];
      if(typeof value==='number'&&Number.isFinite(value)&&value>=0)reading[metric]=value;
    }
    if(Object.keys(reading).length)rows.set(id,reading);
  }
  if(!rows.size)return;
  let observation=observations.get(at);
  if(!observation){observation={at,source,publication,documents:[],rows:new Map()};observations.set(at,observation);}
  if(!observation.documents.includes(path))observation.documents.push(path);
  for(const [id,reading] of rows){
    const previous=observation.rows.get(id);
    if(previous&&Object.keys(reading).some(metric=>previous[metric]!==undefined&&previous[metric]!==reading[metric]))throw Error('Conflicting readings at '+at);
    observation.rows.set(id,{...previous,...reading});
  }
}
for(const path of ['app/lib/firstPaint/receizFirstPaintProof.v1.json','app/lib/firstPaint/profiles/bjklock.v1.json','app/lib/firstPaint/profiles/released-index.v1.json']){
  for(const hash of versions(receiz,path)){
    const doc=atVersion(receiz,hash,path);
    const heads=doc.profiles?Object.values(doc.profiles):doc.records?Object.values(doc.records).map(r=>r.profile):[doc.profile];
    add(doc.generatedAt,heads,'Receiz public Showcase',hash,path);
  }
}
const marketPath='public/receiz-public-market.json';
for(const hash of versions(bank,marketPath)){
  const {transport}=atVersion(bank,hash,marketPath);
  if(transport?.publicProfileHeads)add(transport.generatedAt,transport.publicProfileHeads,'Bankeiz public Showcase',hash,marketPath);
}
const {audience}=directory;
add(audience.observedAt,audience.heads,'Receiz public Showcase',null,'/api/market/public-membership');

const prior=new Map(),result=[];
const totals=Object.fromEntries(Object.keys(fields).map(key=>[key,{value:0,covered:0}]));
for(const {at,source,publication,documents,rows} of Array.from(observations.values()).sort((a,b)=>a.at.localeCompare(b.at))){
  const entry={at,source,publication,documents,reported:{}};
  const changes=new Map();
  for(const metric of Object.keys(fields)){
    let value=0,covered=0;
    for(const [id,reading] of rows){
      if(reading[metric]===undefined)continue;
      value+=reading[metric];covered++;
      const key=id+'/'+metric;
      const earlier=prior.get(key);
      if(earlier){
        let interval=changes.get(earlier.at);
        if(!interval){interval={from:earlier.at};changes.set(earlier.at,interval);}
        const delta=interval[metric]??={value:0,covered:0};
        delta.value+=reading[metric]-earlier.value;
        delta.covered++;
      }
      totals[metric].value+=reading[metric]-(earlier?.value??0);
      if(!earlier)totals[metric].covered++;
      prior.set(key,{at,value:reading[metric]});
    }
    entry.reported[metric]={value:covered?value:null,covered};
    entry[metric]={...totals[metric]};
  }
  entry.intervals=Array.from(changes.values()).sort((a,b)=>a.from.localeCompare(b.from));
  result.push(entry);
}
if(result.length<2)throw Error('Insufficient dated public releases.');
await writeFile(new URL('../src/observatory/audience-observations.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
const earlier=[];
for(const [userId,username] of publicCards){
  const metrics={};
  for(const key of Object.keys(fields)){
    const reading=prior.get(userId+'/'+key);
    if(reading&&reading.at<audience.observedAt)metrics[key]=reading;
  }
  if(Object.keys(metrics).length)earlier.push({userId,username,metrics});
}
await writeFile(new URL('../src/observatory/audience-held-totals.json',import.meta.url),JSON.stringify(earlier)+'\n');
console.log(result.length+' public observations, '+result[0].at+' through '+result.at(-1).at);
