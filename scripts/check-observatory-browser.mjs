import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {chromium} from 'playwright';

// Run against the compiled public document. Replay only inside the disposable
// browser context so the real reader, chart and durable cache handle the change.
const url=new URL('/analytics/',process.argv[2] || 'http://127.0.0.1:4173');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
const profile=await mkdtemp(join(tmpdir(),'bankeiz-obs-browser-'));
const launch={viewport:{width:1440,height:1000},headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})};
const id='observatory-local-browser-check';
let context, actionReads=0, replay=false;
const errors=[];
const directory=JSON.parse(await readFile(new URL('../src/observatory/public-directory.json',import.meta.url),'utf8'));
const publishedAudience=JSON.parse(await readFile(new URL('../src/observatory/audience-observations.json',import.meta.url),'utf8'));
const traffic=JSON.parse(await readFile(new URL('../src/observatory/network-activity.json',import.meta.url),'utf8'));
const trafficTotal=traffic.days.reduce((sum,row)=>sum+Object.values(row.routes).reduce((a,b)=>a+b,0),0);
const trafficText=n=>new Intl.NumberFormat('en-US').format(n);
const revisedTraffic=structuredClone(traffic);
revisedTraffic.observedAt=new Date(Date.parse(traffic.observedAt)+60000).toISOString();
revisedTraffic.days.at(-1).routes['/']=(revisedTraffic.days.at(-1).routes['/']??0)+1;
const ledgerSeed=JSON.parse(gunzipSync(await readFile(new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url))));
const observedEventAt=new Date().toISOString();
const futureEventAt=new Date(Date.now()+14*86400000).toISOString();
const futureId='observatory-local-calendar-check';
const profileId='aaaabbbb-1111-4444-aaaa-bbbbbbbbbbbb',username='observatory_local_check';
const profileEvent={userId:profileId,username,displayName:'Local public directory test',createdAt:'2026-11-01T00:00:00Z',updatedAt:new Date().toISOString(),isPrivate:false};
let initialProfiles;
async function open(options={},path=url.pathname){
  context=await chromium.launchPersistentContext(profile,{...launch,...options});
  await context.route('**/functions/v1/receiz-network-activity',route=>replay?route.fulfill({json:revisedTraffic,headers:{'access-control-allow-origin':'*'}}):route.abort('internetdisconnected'));
  await context.route('**/api/**',async route=>{
    const request=new URL(route.request().url());
    if(replay&&request.pathname==='/api/bank/public-network'&&request.searchParams.get('source')==='actions'){
      actionReads++;
      return route.fulfill({json:{ok:true,source:'actions',complete:true,rows:[{id,actionKind:'observatory.test',summary:'Local browser observation',occurredAt:observedEventAt},{id:futureId,actionKind:'calendar.event.manual.created',occurredAt:futureEventAt}]}});
    }
    if(replay&&request.pathname==='/api/bank/public-profile-directory'){
      return route.fulfill({json:{ok:true,schema:'bank.public-profile-directory.v1',profiles:[{userId:profileId,username,updatedAt:profileEvent.updatedAt}],publicProfileHeads:[{profile:profileEvent,viewer:{canView:true},unavailableDecorators:['profile-details']}],nextCursor:null}});
    }
    return route.abort('internetdisconnected');
  });
  const page=context.pages()[0]??await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(new URL(path,url).href,{waitUntil:'domcontentloaded'});
  return page;
}
try{
  let page=await open({javaScriptEnabled:false});
  assert.equal(await page.locator('.obs-brand svg').count(),1);
  assert.ok(await page.getByRole('heading',{name:'Network pulse'}).isVisible());
  const initialTotal=Number((await page.locator('.obs-reading').last().locator('strong').innerText()).replaceAll(',',''));
  assert.ok(initialTotal>0);
  assert.ok(await page.locator('.obs-bars i').count()>0);
  assert.ok(await page.getByRole('heading',{name:'Audience',exact:true}).isVisible());
  assert.ok(Number((await page.locator('#obs-audience .obs-audience-grid strong').last().innerText()).replaceAll(',',''))>0);
  initialProfiles=Number((await page.locator('#obs-audience .obs-audience-grid strong').first().innerText()).replaceAll(',',''));
  assert.equal(initialProfiles,directory.cards.length);
  assert.equal(await page.locator('.obs-traffic-block').first().locator('.obs-section-head strong').innerText(),trafficText(trafficTotal));
  assert.equal(await page.locator('.obs-app-metrics strong').first().innerText(),trafficText(traffic.identities));
  assert.equal(await page.locator('.obs-app-table tbody tr').count(),traffic.apps.length);
  const profileGrowth=page.locator('#obs-growth .obs-growth').filter({has:page.getByRole('heading',{name:'Profiles by creation date'})});
  await profileGrowth.locator('summary').click();
  const months=new Map();
  for(const profile of directory.cards){const month=new Date(profile.createdAt).toISOString().slice(0,7);months.set(month,(months.get(month)??0)+1);}
  assert.deepEqual(await profileGrowth.locator('tbody tr').evaluateAll(rows=>rows.map(row=>[row.querySelector('time').dateTime,Number(row.lastElementChild.textContent.replaceAll(',',''))])),[...months].sort(([a],[b])=>b.localeCompare(a)));
  assert.ok(await page.locator('#obs-profiles tbody tr').count()>0);
  const expectedActions=Number((await page.locator('.obs-breakdown button').first().locator('strong').innerText()).replaceAll(',',''));
  assert.equal(await page.locator('#obs-wallets svg.obs-wallet-chart').count(),4);
  assert.equal(await page.locator('#obs-audience .obs-audience-spark svg').count(),4);
  assert.equal(await page.locator('.obs-action-growth .obs-growth>svg').count(),4);
  assert.ok((await page.locator('.obs-observation-dates').innerText()).includes('May 19, 2026'));
  assert.equal(await page.locator('#obs-audience .obs-audience-spark .obs-wallet-series').count(),4);
  const audienceCards=page.locator('#obs-audience .obs-audience-grid strong');
  const latestAudience=publishedAudience.at(-1);
  assert.equal(await audienceCards.nth(1).innerText(),new Intl.NumberFormat('en-US').format(latestAudience.views.value));
  assert.equal(await audienceCards.nth(2).innerText(),new Intl.NumberFormat('en-US').format(latestAudience.plays.value));
  assert.equal(await audienceCards.nth(3).innerText(),new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(latestAudience.seconds.value/3600));
  const movements=ledgerSeed.records.filter(row=>row.source==='wallet'&&['chat_transfer','transfer'].includes(row.kind));
  const amounts=movements.flatMap(row=>{
    if(row.amountUsdCents!=null)return [BigInt(row.amountUsdCents)];
    const {settledUsdCents,phiUsdCents}=row.valueOperands??{};
    return settledUsdCents!=null&&phiUsdCents!=null?[BigInt(settledUsdCents)+BigInt(phiUsdCents)]:[];
  }).sort((a,b)=>a<b?-1:a>b?1:0);
  const volume=amounts.reduce((sum,cents)=>sum+cents,0n),n=amounts.length;
  const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
  const sizes=page.getByRole('group',{name:'Transaction sizes'});
  assert.deepEqual(await sizes.locator('dd').allTextContents(),[
    Number(volume)/n,(Number(amounts[Math.floor((n-1)/2)])+Number(amounts[Math.floor(n/2)]))/2,
    Number(amounts[Math.ceil(n*.9)-1]),Number(amounts.at(-1)),
  ].map(cents=>money.format(cents/100)));
  assert.equal(await page.locator('#obs-wallets .obs-wallet-grid > div').filter({has:page.getByRole('heading',{name:'Wallet transfer volume',exact:true})}).locator('strong').innerText(),new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(volume)/100));
  assert.equal(await page.locator('#obs-wallets').getByText('Reserve',{exact:true}).count(),0);
  assert.equal(await page.locator('#obs-wallets').getByText('Settlement',{exact:true}).count(),0);
  await context.close();

  // The preceding no-JavaScript entry cannot have populated browser storage.
  // A fresh Ledger visit must already have the complete public directory.
  page=await open({},'/ledger/');
  await page.getByRole('link',{name:'Analytics',exact:true}).click();
  const plays=page.locator('#obs-audience').getByRole('button',{name:'Stream plays',exact:true});
  await plays.click();
  await page.waitForFunction(()=>document.querySelector('#obs-audience button[aria-pressed=true]')?.textContent==='Stream plays');
  assert.deepEqual(await page.locator('#obs-audience .obs-audience-grid strong').allTextContents(),
    [directory.cards.length,latestAudience.views.value,latestAudience.plays.value,latestAudience.seconds.value/3600]
      .map(value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value)));
  await context.close();

  page=await open();
  const slider=page.getByRole('slider',{name:'Activity interval'});
  const ranges=page.locator('.obs-period').getByRole('button',{name:'24H',exact:true});
  // Static markup already has usable facts. Wait for a real React interaction.
  await ranges.click();
  await page.waitForFunction(()=>document.querySelector('.obs-period button[aria-pressed="true"]')?.textContent==='24H');
  assert.ok(await page.getByRole('button',{name:'Showcase',exact:true}).first().isVisible());
  assert.ok(await page.getByRole('heading',{name:'Collectible activity',exact:true}).isVisible());
  const collectible=page.locator('#obs-collectibles');
  const facts=await collectible.locator('.obs-audience-grid strong').allTextContents();
  assert.ok(Number(facts[0].replaceAll(',',''))>59&&facts[1].startsWith('$'));
  const streams=page.getByRole('group',{name:'Chart source'});
  assert.deepEqual(await streams.getByRole('button').allTextContents(),['Actions','Wallet records','Showcase']);
  await streams.getByRole('button',{name:'Showcase',exact:true}).click();
  await page.locator('.obs-period').getByRole('button',{name:'All',exact:true}).click();
  assert.equal(await streams.getByRole('button',{name:'Showcase'}).getAttribute('aria-pressed'),'true');
  await page.locator('.obs-streams').getByRole('button',{name:'Actions',exact:true}).click();
  await ranges.click();
  const entryUrl=page.url();
  await page.setViewportSize({width:320,height:568});
  for(const [i,name] of ['Global market cap','Assets in circulation','Witnessed hours','Public ledger records'].entries()){
    const trigger=page.locator('.obs-readings').getByRole('button',{name:new RegExp(name)});
    await trigger.click();
    const dialog=page.getByRole('dialog',{name,exact:true});
    await dialog.getByRole('img',{name:new RegExp(name+' history')}).waitFor();
    assert.equal(await dialog.getByRole('link').getAttribute('href'),['/market-cap/','/explore/','#obs-audience','/ledger/'][i]);
    assert.ok((await dialog.locator('.obs-headline-line').getAttribute('d')).length>4);
    const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=321);
    if(name==='Assets in circulation'){
      assert.equal(await dialog.getByRole('img').count(),1);
      assert.ok(await dialog.getByRole('button',{name:/^Inventory on/}).count()>0);
      for(const range of ['1H','24H','7D','30D','90D','1Y','All time']){
        await dialog.getByRole('button',{name:range,exact:true}).click();
        const extent=await dialog.locator('.obs-headline-line').evaluate(path=>{const box=path.getBBox();return [box.x,box.x+box.width];});
        assert.deepEqual(extent,[0,100],'Dated issuance spans the entire '+range+' plot');
      }
      assert.ok(Number(await dialog.getByRole('slider').getAttribute('max'))>100,'Dated inventory issuances remain inspectable between published totals');
    }
    if(name==='Witnessed hours'){
      for(const range of ['1H','24H','7D','30D','90D','1Y','All time']){
        await dialog.getByRole('button',{name:range,exact:true}).click();
        assert.deepEqual(await dialog.locator('.obs-headline-line').evaluate(p=>{const b=p.getBBox();return [b.x,b.x+b.width];}),[0,100]);
      }
      const count=publishedAudience.filter(row=>row.seconds.value!==null).length;
      assert.ok(Number(await dialog.getByRole('slider').getAttribute('max'))>=count-1,'Every hours publication can be inspected');
    }
    if(name==='Assets in circulation'||name==='Witnessed hours'){
      const commands=await dialog.locator('.obs-headline-line').getAttribute('d');
      assert.equal((commands.match(/V/g)??[]).length,Number(await dialog.getByRole('slider').getAttribute('max')),'Each dated change is drawn');
    }
    await dialog.getByRole('button',{name:'7D',exact:true}).click();
    await dialog.getByRole('button',{name:'All time'}).click();
    await dialog.getByRole('slider').focus();await dialog.getByRole('slider').press('Home');
    assert.equal(await dialog.getByRole('slider').inputValue(),'0');
    if(i%2)await dialog.getByRole('button',{name:'Close chart'}).click();else await page.keyboard.press('Escape');
    await dialog.waitFor({state:'detached'});
    assert.equal(page.url(),entryUrl);
    assert.ok(await trigger.evaluate(el=>el===document.activeElement));
  }
  await page.setViewportSize(launch.viewport);
  await page.getByRole('combobox',{name:'Traffic page group'}).selectOption('/wallet');
  const walletRenders=traffic.days.reduce((s,r)=>s+(r.routes['/wallet']??0),0);
  assert.equal(await page.locator('.obs-traffic-block').first().locator('.obs-section-head strong').innerText(),trafficText(walletRenders));
  await page.getByRole('combobox',{name:'Traffic page group'}).selectOption('');
  await page.locator('.obs-app-select').first().click();
  assert.ok(await page.locator('#app-contribution-detail .obs-app-chart').isVisible());
  await page.locator('#app-contribution-detail summary').click();
  assert.ok(await page.locator('#app-contribution-detail tbody tr').count()>0);
  await page.locator('.obs-app-select').first().click();
  assert.equal(await slider.getAttribute('aria-valuemax'),'48');
  const walletSlider=page.getByRole('slider',{name:'Inspect wallet history'});
  await walletSlider.focus();await walletSlider.press('Home');
  assert.equal(await page.locator('#obs-wallets .obs-wallet-grid output').count(),4);
  await page.locator('#obs-wallets').getByRole('button',{name:'Latest'}).click();
  await page.locator('#obs-audience').getByRole('button',{name:'Totals over time'}).click();
  await page.locator('#obs-audience summary').filter({hasText:'published readings'}).click();
  assert.ok(await page.locator('#obs-audience tbody tr').count()>=20);
  for(const metric of ['Original views','Stream plays','Witnessed hours']){
    await page.locator('#obs-audience').getByRole('button',{name:metric,exact:true}).click();
    const publication=page.getByRole('slider',{name:'Inspect publication'});
    await publication.focus();await publication.press('Home');
    assert.ok((await page.locator('.obs-audience-inspect output').innerText()).includes('2026-05-19'));
    const audienceRange=page.getByRole('group',{name:'Audience history range'});
    await audienceRange.getByRole('button',{name:'24H',exact:true}).click();
    assert.equal(await page.locator('.obs-observation-field button').count(),1);
    assert.deepEqual(await page.locator('.obs-published-line path').evaluate(p=>{const b=p.getBBox();return [b.x,b.x+b.width];}),[0,100]);
    await audienceRange.getByRole('button',{name:'All',exact:true}).click();
    assert.ok(await page.locator('.obs-observation-field button').count()>20);
  }
  await page.getByRole('combobox',{name:'Growth by action type'}).selectOption('receiz.seal.document');
  await page.getByRole('button',{name:'Inspect receiz.seal.document in Network pulse'}).click();
  assert.equal(await page.getByRole('combobox',{name:'Filter by record type'}).inputValue(),'receiz.seal.document');
  await page.getByRole('combobox',{name:'Filter by record type'}).selectOption('');
  await ranges.click();
  await page.locator('#obs-audience').getByRole('button',{name:'By profile'}).click();
  await slider.focus();await slider.press('Home');
  assert.equal(await slider.getAttribute('aria-valuenow'),'1');
  await page.getByRole('button',{name:'Open history',exact:true}).click();
  assert.ok(await page.locator('.obs-history li').count()>1);
  await page.getByRole('link',{name:'Inspect in Ledger'}).click();
  await page.waitForSelector('.public-ledger-row.is-open');
  assert.ok(page.url().includes('/ledger/#record='));
  await page.goBack();
  await page.getByRole('button',{name:'Follow latest',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const viewport of [{width:320,height:568},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.ok(await page.locator('.obs-status').evaluate(el=>{
      const word=el.querySelector('.obs-status-small');
      return word.getClientRects().length===1&&word.getBoundingClientRect().height<18&&el.getBoundingClientRect().right<=innerWidth;
    }),'Connection status fits one line');
    assert.ok(await page.locator('.obs-sections').evaluate(nav=>{
      const links=Array.from(nav.querySelectorAll('a'),a=>a.getBoundingClientRect());
      return links.every(link=>Math.abs(link.top-links[0].top)<1)&&links.at(-1).right<=nav.getBoundingClientRect().right+1;
    }),'Every section link fits in a single row');
    assert.ok(await page.locator('.obs-field').evaluate(el=>{const chart=el.getBoundingClientRect();return chart.bottom+scrollY<=innerHeight&&chart.height>=130;}),'Entire plot fits the initial mobile viewport');
  }
  if(process.env.OBSERVATORY_MOBILE_SCREENSHOT){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:process.env.OBSERVATORY_MOBILE_SCREENSHOT});}
  if(process.env.OBSERVATORY_NAV_SCREENSHOT)await page.locator('.obs-sections').screenshot({path:process.env.OBSERVATORY_NAV_SCREENSHOT});
  if(process.env.OBSERVATORY_AUDIENCE_SCREENSHOT){
    await page.locator('#obs-audience').getByRole('button',{name:'Totals over time'}).click();
    await page.locator('#obs-audience').screenshot({path:process.env.OBSERVATORY_AUDIENCE_SCREENSHOT});
  }
  if(process.env.OBSERVATORY_WALLET_SCREENSHOT)await page.locator('#obs-wallets').screenshot({path:process.env.OBSERVATORY_WALLET_SCREENSHOT});
  if(process.env.OBSERVATORY_TOTALS_SCREENSHOT)await page.locator('#obs-audience .obs-audience-grid').screenshot({path:process.env.OBSERVATORY_TOTALS_SCREENSHOT});
  await page.setViewportSize(launch.viewport);
  await page.locator('.obs-period').getByRole('button',{name:'All',exact:true}).click();
  const heldDates=await page.locator('.obs-ticks').innerText();
  await page.locator('.obs-period').getByRole('button',{name:'30D',exact:true}).click();
  await page.getByRole('button',{name:'Previous time window'}).click();
  assert.ok(await page.getByRole('button',{name:'Next time window'}).isEnabled());
  await page.getByRole('button',{name:'Next time window'}).click();
  await page.locator('.obs-period').getByRole('button',{name:'All',exact:true}).click();
  assert.equal(await page.locator('.obs-ticks').innerText(),heldDates);
  const find=page.getByRole('searchbox',{name:'Search public profiles'});
  await find.fill(directory.cards.at(-1).username);
  initialProfiles=Number((await page.locator('#obs-audience .obs-audience-grid strong').first().innerText()).replaceAll(',',''));
  assert.equal(initialProfiles,directory.cards.length);
  assert.ok(await page.locator('#obs-profiles tbody a').filter({hasText:'@'+directory.cards.at(-1).username}).count()>0);
  await find.fill('');
  await page.locator('.obs-period').getByRole('button',{name:'24H',exact:true}).click();

  replay=true;
  const accepted=page.locator('.obs-row[href*="'+id+'"]');
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await accepted.waitFor({timeout:45_000});
  await page.waitForFunction(value=>document.querySelector('.obs-traffic-block .obs-section-head strong')?.textContent===value,trafficText(trafficTotal+1));
  assert.equal(await accepted.count(),1);
  const connectedLabel=page.locator('.obs-status-small');
  await page.setViewportSize({width:320,height:568});
  await page.waitForFunction(()=>document.querySelector('.obs-status-small')?.textContent==='Public source connected');
  assert.equal(await connectedLabel.evaluate(label=>label.getClientRects().length),1);
  await page.setViewportSize(launch.viewport);
  const countActions=async()=>Number((await page.locator('.obs-breakdown button').first().locator('strong').innerText()).replaceAll(',',''));
  assert.equal(await countActions(),expectedActions+2);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(async id=>{
    const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('receiz-bank-public-projections');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    try{return await new Promise(resolve=>{const r=db.transaction('public').objectStore('public').get('network');r.onsuccess=()=>resolve(r.result?.records.some(item=>item.sourceId===id));r.onerror=()=>resolve(false);});}finally{db.close();}
  },id,{timeout:45_000,polling:1000});
  assert.equal(await countActions(),expectedActions+2);
  assert.ok(actionReads>=1);
  assert.ok(await page.locator('.obs-future summary').isVisible());
  assert.equal(await page.locator('#observatory-records a[href*="'+futureId+'"]').count(),0);
  await find.fill(username);
  await page.locator('#obs-profiles tbody a').filter({hasText:'@'+username}).waitFor({timeout:55_000});
  await find.fill('');
  await context.close();replay=false;
  page=await open();
  await page.locator('.obs-row[href*="'+id+'"]').waitFor({timeout:45_000});
  assert.equal(await page.locator('.obs-traffic-block').first().locator('.obs-section-head strong').innerText(),trafficText(trafficTotal+1));
  assert.equal(await countActions(),expectedActions+2);
  const coldFind=page.getByRole('searchbox',{name:'Search public profiles'});
  await coldFind.fill(username);
  await page.locator('#obs-profiles tbody a').filter({hasText:'@'+username}).waitFor({timeout:55_000});
  assert.deepEqual(errors,[]);
  await page.locator('.obs-readings').getByRole('button',{name:/Global market cap/}).click();
  await page.getByRole('dialog',{name:'Global market cap'}).getByRole('link',{name:'Open Global Market Cap'}).click();
  await page.waitForURL(u=>u.pathname==='/market-cap/',{waitUntil:'commit'});
  await page.getByRole('heading',{name:'Global Market Cap',exact:true,level:1}).waitFor();
  console.log(JSON.stringify({openedMarketCap:true,headlinePopovers:4,firstFrameRecords:initialTotal,firstFrameProfiles:initialProfiles,totalsFromLedger:true,walletCharts:4,audienceCharts:4,singleLineNavigation:true,singleLineStatus:true,lastDirectoryPageSearch:true,cardOnlyProfileRetained:true,datedFutureRecordSeparated:true,actionsBefore:expectedActions,actionsAfter:await countActions(),keyboard:true,mobile:true,inspectedLedgerRecord:true,retainedAfterColdReopen:true}));
}finally{
  await context?.close().catch(()=>{});
  await rm(profile,{recursive:true,force:true});
}
