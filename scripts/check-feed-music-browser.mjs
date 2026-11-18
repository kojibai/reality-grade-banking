import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {chromium,webkit} from 'playwright';

// Run against the compiled anonymous Feed and shipped catalog. Only the external
// media responses are fixtures. Both engines perform native decoding and scrolling.
const dist=resolve(process.env.BANK_REGRESSION_DIST??'dist');
const origin='https://bankeiz.test';
const artwork=await readFile(resolve(dist,'icon-192.png'));
const sampleRate=8000,frames=sampleRate*2;
const wave=Buffer.alloc(44+frames*2);
wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);
wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);
wave.writeUInt32LE(sampleRate,24);wave.writeUInt32LE(sampleRate*2,28);
wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);
wave.writeUInt32LE(frames*2,40);
for(let i=0;i<frames;i++)wave.writeInt16LE(Math.round(128*Math.sin(i/8)),44+i*2);

async function check(engine){
 const options=engine===chromium&&process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{};
 const browser=await engine.launch(options);
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const streams=new Set(),errors=[];
  let failNewStreams=false;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===origin){
    if(url.pathname.startsWith('/api/'))return; // Keep all app API reads stalled.
    const file=resolve(dist,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));
    assert.ok(file.startsWith(dist+sep));
    try{await access(file);}catch{return route.fulfill({status:404,body:''});}
    return route.fulfill({path:file});
   }
   const headers=request.headers(),range=headers.range;
   // Linux WebKit classifies native audio as "other" and can request the whole file.
   if(url.origin==='https://receiz.com'&&(request.resourceType()==='media'||headers['sec-fetch-dest']==='audio'||range)){
    if(failNewStreams&&!streams.has(url.href))return route.abort('failed');
    streams.add(url.href);
    const match=/^bytes=(\d+)-(\d*)$/.exec(range??'');
    const start=Number(match?.[1]??0),end=Math.min(Number(match?.[2]||wave.length-1),wave.length-1);
    return route.fulfill({status:match?206:200,headers:{'content-type':'audio/wav','accept-ranges':'bytes',
     ...(match?{'content-range':`bytes ${start}-${end}/${wave.length}`}:{})},body:wave.subarray(start,end+1)});
   }
   if(request.resourceType()==='image')return route.fulfill({contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:artwork});
   return route.abort();
  });
  await page.addInitScript(()=>{
   window.musicEvents=[];
   for(const name of ['play','ended']){
    document.addEventListener(name,event=>{
     const audio=event.target;
     if(!(audio instanceof HTMLAudioElement))return;
     const other=[...document.querySelectorAll('[data-feed-music-owner] audio')].find(node=>node!==audio);
     const cover=document.querySelector('.feed-stage[aria-hidden=false] .feed-artwork');
     const nextCover=cover?.closest('article')?.nextElementSibling?.querySelector('.feed-artwork');
     window.musicEvents.push({name,audio,source:audio.currentSrc||audio.src,prepared:other,preparedSource:other?.src,
      preparedReady:other?.readyState,cover,nextCover,coverReady:!!cover?.naturalWidth});
    },true);
   }
  });
  await page.goto(origin+'/feed/',{waitUntil:'domcontentloaded'});
  const stage=page.locator('.feed-stage[aria-hidden=false]');
  await stage.getByRole('button',{name:'Browse feed'}).click();
  await page.getByRole('button',{name:'Music',exact:true}).click();
  await stage.getByRole('button',{name:'Play music'}).click();

  // Two transitions are needed to replace the first snap target by a spacer.
  // Listen through a third transition and allow the fourth track to progress.
  await page.waitForFunction(()=>window.musicEvents.filter(e=>e.name==='play').length>=4
   &&[...document.querySelectorAll('audio')].some(a=>!a.paused&&a.currentTime>=0.4));
  await stage.getByRole('button',{name:'Pause music'}).click();
  const result=await page.evaluate(()=>{
   const events=window.musicEvents,scroll=document.querySelector('.feed-scroll');
   return {events:events.map(e=>e.name),tracks:events.filter(e=>e.name==='play').map(e=>e.source),
    handoffs:events.flatMap((e,i)=>e.name==='ended'?[{ready:e.preparedReady>=HTMLMediaElement.HAVE_FUTURE_DATA,
     promoted:events[i+1]?.audio===e.prepared&&events[i+1]?.source===e.preparedSource,
     cover:e.coverReady&&e.nextCover===(events[i+2]?.cover??document.querySelector('.feed-stage[aria-hidden=false] .feed-artwork'))}]:[]),
    viewportPage:Math.round(scroll.scrollTop/scroll.clientHeight),
    mounted:document.querySelectorAll('.feed-stage').length,players:document.querySelectorAll('audio').length};
  });
  assert.deepEqual(result.events,['play','ended','play','ended','play','ended','play'],'each natural end advances exactly once');
  assert.equal(new Set(result.tracks).size,4);
  assert.ok(result.handoffs.every(h=>h.ready&&h.promoted&&h.cover),'reuse the buffered next song and preserve decoded artwork');
  assert.equal(result.viewportPage,3);assert.equal(result.mounted,3);assert.equal(result.players,2);
  assert.ok(streams.size<=5,'only the current neighborhood may request audio');

  const next=await stage.locator('xpath=following-sibling::article[1]').getAttribute('data-feed-item');
  await page.locator('.feed-scroll').press('ArrowDown');
  await page.waitForFunction(id=>{
   const scroll=document.querySelector('.feed-scroll'),current=document.querySelector('.feed-stage[aria-hidden=false]');
   return current?.dataset.feedItem===id&&Math.abs(scroll.scrollTop-4*scroll.clientHeight)<2&&current.querySelector('.feed-artwork')?.naturalWidth>0;
  },next);
  assert.equal(await stage.getByRole('button',{name:'Play music'}).count(),1,'manual navigation honors Pause');

  // Resume the prepared fifth track. A genuinely unavailable sixth stream
  // must leave its cover and retry control present, without skipping ahead.
  const unavailable=await stage.locator('xpath=following-sibling::article[1]').getAttribute('data-feed-item');
  failNewStreams=true;
  await stage.getByRole('button',{name:'Play music'}).click();
  await stage.getByText('Playback could not start. Try again.').waitFor();
  assert.equal(await stage.getAttribute('data-feed-item'),unavailable);
  assert.ok(await stage.locator('.feed-artwork').evaluate(img=>img.complete&&img.naturalWidth>0));
  assert.equal(await stage.getByRole('button',{name:'Play music'}).count(),1);
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('audio')].some(audio=>!audio.paused)),false);
  assert.deepEqual(errors,[]);
  console.log(engine.name()+' passed three preloaded handoffs, cover retention, manual navigation and an unavailable next song.');
 }finally{await browser.close();}
}

for(const engine of [webkit,chromium])await check(engine);
