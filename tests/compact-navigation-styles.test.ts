// @vitest-environment happy-dom
import{act}from'react';import{readFileSync}from'node:fs';import{expect,it,vi}from'vitest';import{compactNavigation}from'../scripts/compact-navigation.mjs';
const css='.account{color:#14283f;padding:24px}',publicCss='.public{color:#244cdb}',head=`<title>Guide</title><link rel="canonical" href="https://bankeiz.com/guide/"><style data-public-page-style="guide">${css}${publicCss}</style>`;
const source=()=>compactNavigation({pages:{'/guide/':{title:'Guide',head,content:'<main>Guide <a href="/">Your account</a></main>'}},bank:{head:'<title>Bankeiz</title><link rel="canonical" href="https://bankeiz.com/">',content:'<main>Account</main>',entry:'/unused-bank.js',styles:['/account.css'],css:{'/account.css':css}}});
it('shares exact stylesheet bytes between public heads and the retained Bank without changing either destination',()=>{const result=source(),decode=(value:any)=>Array.isArray(value)?value.map(part=>typeof part==='number'?result.styles[part]:part).join(''):value;expect(decode(result.pages['/guide/'].head)).toBe(head);expect(decode((result.bank.css as Record<string,unknown>)['/account.css'])).toBe(css);expect(result.styles.filter(value=>value===css)).toHaveLength(1);expect(result.bank.styles).toEqual(['/account.css']);});
it('paints the same held Bank synchronously with its carried CSS, without any stylesheet request',async()=>{history.replaceState({},'','/guide/');document.head.innerHTML=head;document.body.innerHTML='<div id="root" hidden><main><input value="Retained account"/></main></div><div id="public-learn-root"><main>Guide <a href="/">Your account</a></main></div>';const bank=document.getElementById('root'),input=bank?.querySelector('input'),data=document.createElement('script');data.id='receiz-navigation';data.textContent=JSON.stringify(source());document.body.append(data);const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{}),fetcher=vi.fn();try{new Function('window','document','location','history','scrollTo','Event','URL','fetch','DOMParser','// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1])(window,document,location,history,scroll,Event,URL,fetcher,DOMParser);await act(async()=>document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click());expect(location.pathname).toBe('/');expect(document.getElementById('root')).toBe(bank);expect(bank?.hidden).toBe(false);expect(bank?.querySelector('input')).toBe(input);expect(document.querySelector('style[data-bank-stylesheet]')?.textContent).toBe(css);expect(document.querySelector('link[href="/account.css"]')).toBeNull();expect(fetcher).not.toHaveBeenCalled();}finally{scroll.mockRestore();document.body.innerHTML='';history.replaceState({},'','/');}});
it('carries repeated public evidence styles once while preserving every destination head exactly',()=>{
 const evidence='.ledger-proof-details{color:#172b45;padding:24px;margin:16px;border:1px solid #dfe5ed}'.repeat(80),pages=Object.fromEntries(Array.from({length:12},(_,i)=>['/section-'+i+'/',{title:'Section '+i,content:'',head:`<title>Section ${i}</title><style>${css}\n${evidence}</style>`}]));
 const packed=compactNavigation({pages,bank:{head:'<title>Bank</title>',content:'',styles:['/account.css'],css:{'/account.css':css}}}),decode=(v:any)=>Array.isArray(v)?v.map(p=>typeof p==='number'?packed.styles[p]:p).join(''):v;
 for(const [path,page]of Object.entries(pages))expect(decode(packed.pages[path].head)).toBe(page.head);
 expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify({pages}).length/3);
});
it('shares rules repeated across differently factored chunks without changing CSS bytes or cascade order',()=>{
 const shared='.carried-proof{--caption:"a } and \\\" b";background-image:url("data:image/svg+xml,%3Csvg%3E");'+('padding:12px;margin:4px;border:1px solid #dfe5ed;'.repeat(40))+'}',first='.first{color:navy}'+shared+'.last{color:blue}',second='.second{color:green}'+shared+'.last{color:red}';
 const original={pages:{'/one/':{head:'<style>'+first+'</style>',content:''},'/two/':{head:'<style>'+second+'</style>',content:''}},bank:{head:'',content:'',styles:['/first.css'],css:{'/first.css':first}}},packed=compactNavigation(original),decode=(value:any)=>Array.isArray(value)?value.map(part=>typeof part==='number'?packed.styles[part]:part).join(''):value;
 expect(decode(packed.pages['/one/'].head)).toBe(original.pages['/one/'].head);expect(decode(packed.pages['/two/'].head)).toBe(original.pages['/two/'].head);expect(decode((packed.bank.css as Record<string,unknown>)['/first.css'])).toBe(first);
 expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(original).length*.6);expect(packed.styles.filter(part=>part===shared)).toHaveLength(1);
});

it('shares repeated structured metadata and markup attributes while retaining exact destination bytes',()=>{
 const description='The complete carried Original remains available with its exact proof, ownership and history. '.repeat(12)+'Quoted \"terms\", braces {intact}, and \\u003c remain unchanged.';
 const attributeDescription=description.replaceAll('&','&amp;').replaceAll('"','&quot;');
 const pages=Object.fromEntries(Array.from({length:12},(_,i)=>['/work-'+i+'/',{title:'Work '+i,head:'<title>Work '+i+'</title><meta data-work="'+i+'" name="description" content="'+attributeDescription+'"><script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:'Work '+i,description,publisher:{'@type':'Organization',name:'Bankeiz',url:'https://bankeiz.com/'}})+'</script><style>'+css+'</style>',content:'<main data-work="'+i+'" data-proof-description="'+attributeDescription+'"><h1>Work '+i+'</h1></main>'}]));
 const original={pages,bank:{head:'<title>Bank</title>',content:'<main>Account</main>',styles:['/account.css'],css:{'/account.css':css}}},before=structuredClone(original),packed=compactNavigation(original),decode=(value:any)=>Array.isArray(value)?value.map(part=>typeof part==='number'?packed.styles[part]:part).join(''):value;
 for(const [path,page]of Object.entries(pages)){expect(decode(packed.pages[path].head)).toBe(page.head);expect(decode(packed.pages[path].content)).toBe(page.content);}
 expect(decode(packed.bank.head)).toBe(original.bank.head);expect(decode(packed.bank.content)).toBe(original.bank.content);expect(decode((packed.bank.css as Record<string,unknown>)['/account.css'])).toBe(css);expect(original).toEqual(before);
 expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(original).length*.6);
});

it('carries complete Original text once as an intact JSON span through navigation compaction',()=>{
 const text='The complete carried Original remains available with its exact proof, ownership and history. '.repeat(12)+'Quoted "terms", braces {intact}, and \u003c remain unchanged.',carriedText={text},seed=JSON.stringify([{id:'selected-original',carriedText}]).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
 const original={pages:{'/feed/':{head:'<title>For you</title>',content:'<script id="public-feed-seed" type="application/json">'+seed+'</script>'},'/guide/':{head:'<script type="application/ld+json">'+JSON.stringify({description:text})+'</script>',content:'<main>'+text+'</main>'}},bank:{head:'',content:''}},packed=compactNavigation(original),decode=(value:any)=>Array.isArray(value)?value.map(part=>typeof part==='number'?packed.styles[part]:part).join(''):value;
 expect(decode(packed.pages['/feed/'].content)).toBe(original.pages['/feed/'].content);
 const encoded=JSON.stringify(JSON.stringify(carriedText).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026')).slice(1,-1);
 expect(JSON.stringify(packed).split(encoded).length-1).toBe(1);
});

it('shares repeated source-link markup in a retained head without dropping a single destination or attribute',()=>{
 const links=Array.from({length:240},(_,index)=>`<link rel="modulepreload" crossorigin href="/assets/exact-source-${index}.js">`).join('');
 const original={pages:{'/guide/':{head:'<title>Guide</title>',content:'<main>Held guide</main>'}},bank:{head:'<title>Bank</title>'+links,content:'<main>Held Bank</main>'}},before=structuredClone(original),packed=compactNavigation(original),decode=(value:any)=>Array.isArray(value)?value.map(part=>typeof part==='number'?packed.styles[part]:part).join(''):value;
 expect(decode(packed.bank.head)).toBe(original.bank.head);expect(decode(packed.bank.content)).toBe(original.bank.content);expect(original).toEqual(before);
 expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(original).length*.65);
});

it('carries restored metadata and styles once when the document already installs appearance and runtime',()=>{
 const canonical='<link rel="canonical" href="https://bankeiz.com/">';
 const appearance='<style id="bankeiz-appearance">:root{color-scheme:light dark}</style><script>installAppearance()</script>';
 const startup='<link rel="modulepreload" crossorigin href="/assets/bank-chunk.js">'
  +'<script type="module" crossorigin src="/assets/bank.js"></script><link rel="stylesheet" href="/assets/bank.css">'
  +'<style id="bankeiz-opening-critical">body{background:white}</style>';
 const input = {
  pages:{'/guide/':{head:head+appearance,content:'<main>Held guide</main>'}},
  bank:{head:'<title>Bank</title>'+canonical+appearance+startup,content:'<main>Held Bank</main>',
   entry:'/assets/bank.js',styles:['/assets/bank.css'],css:{'/assets/bank.css':css}},
 };
 const before=structuredClone(input),packed=compactNavigation(input,{installedAppearance:appearance});
 const expand=(value:unknown)=>Array.isArray(value)?value.map(part=>typeof part==='number'?packed.styles[part]:part).join(''):value;
 expect(expand(packed.pages['/guide/'].head)).toBe(head);
 expect(expand(packed.bank.head)).toBe('<title>Bank</title>'+canonical);
 expect(packed.bank.entry).toBe(input.bank.entry);
 expect(packed.bank.styles).toEqual(input.bank.styles);
 expect(expand((packed.bank.css as Record<string,unknown>)['/assets/bank.css'])).toBe(css);
 expect(input).toEqual(before);
});

it('keeps unique large destination styles within delivery capacity by sharing their repeated declarations losslessly',()=>{
 const repeated='display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid #dfe5ed;border-radius:12px;background:#fff;color:#172b45;';
 const first=Array.from({length:160},(_,i)=>`.relationship-part-${i}{${repeated}--part:${i}}`).join('');
 const second=Array.from({length:160},(_,i)=>`.proof-part-${i}{${repeated}--proof:${i}}`).join('');
 const original={pages:{'/one/':{head:'<style>'+first+'</style>',content:'<main>Held proof</main>'},'/two/':{head:'<style>'+second+'</style>',content:'<main>Held relationship</main>'}},bank:{head:'<title>Bank</title>',content:'<main>Account</main>',styles:[],css:{}}},before=structuredClone(original),packed=compactNavigation(original),decode=(value:any)=>Array.isArray(value)?value.map(part=>typeof part==='number'?packed.styles[part]:part).join(''):value;
 for(const [path,page]of Object.entries(original.pages)){expect(decode(packed.pages[path].head)).toBe(page.head);expect(decode(packed.pages[path].content)).toBe(page.content);}
 expect(decode(packed.bank.head)).toBe(original.bank.head);expect(decode(packed.bank.content)).toBe(original.bank.content);expect(original).toEqual(before);expect(packed.styles.every(value=>typeof value==='string')).toBe(true);
 expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(original).length*.8);
});

it('installs the carried Learn stylesheet once before revealing a guide from Bank',async()=>{
 history.replaceState({},'','/');
 document.head.innerHTML='<title>Bankeiz</title><link rel="canonical" href="https://bankeiz.com/">';
 document.body.innerHTML='<div id="root"><main><a href="/guide/">Open guide</a></main></div>';
 const learnCss='html.learn-surface .learn-header{position:fixed}';
 const data=document.createElement('script');
 data.id='receiz-navigation';
 data.textContent=JSON.stringify({...source(),learnCss});
 document.body.append(data);
 const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{}),fetcher=vi.fn();
 try{
  const runRouter=new Function('window','document','location','history','scrollTo','Event','URL','fetch','DOMParser','// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1]);
  runRouter(window,document,location,history,scroll,Event,URL,fetcher,DOMParser);
  const {navigate}=data as HTMLScriptElement & {navigate:(destination:string)=>void};
  const styles=()=>[...document.head.querySelectorAll('style[data-learn-stylesheet]')];
  expect(styles()).toHaveLength(0);
  await act(async()=>navigate('/guide/'));
  expect(location.pathname).toBe('/guide/');
  const [stylesheet]=styles(),pageStyle=document.querySelector('style[data-public-page-style]');
  expect(stylesheet?.textContent).toBe(learnCss);
  expect(stylesheet?.nextElementSibling).toBe(pageStyle);
  await act(async()=>navigate('/'));
  await act(async()=>navigate('/guide/'));
  expect(styles()).toEqual([stylesheet]);
  expect(fetcher).not.toHaveBeenCalled();
 }finally{scroll.mockRestore();document.body.innerHTML='';history.replaceState({},'','/');}
});
