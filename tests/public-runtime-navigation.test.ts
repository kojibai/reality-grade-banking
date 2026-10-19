// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';

it('carries public workspaces immediately and retains each mounted workspace across navigation',async()=>{
 const script=readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];
 const source='// All public guides'+script;
 history.replaceState({},'', '/learn/');
 document.head.innerHTML='<title>Learn</title>';
 document.body.innerHTML='<div id="public-learn-root"><main>Learn</main><a href="/ledger/">Ledger</a></div>';
 const nav=document.createElement('script');nav.id='receiz-navigation';nav.type='application/json';
 const pages:Record<string,unknown>={'/learn/':{head:'<title>Learn</title>',content:'<main>Learn</main><a href="/ledger/">Ledger</a>'}};
 for(const name of ['ledger','explore','verify','conformance','receipt'])pages[`/${name}/`]={runtime:name,entry:`/${name}.js`,head:`<title>${name}</title><style data-public-page-style="${name}">body{color:navy}</style>`,content:`<main><h1>${name}</h1><input value="${name}"><a href="/learn/">Learn</a><a href="/explore/">Explore</a><a href="/verify/">Verify</a><a href="/conformance/">Conformance</a><a href="/ledger/">Ledger</a></main>`};
 nav.textContent=JSON.stringify({pages,bank:{head:'<title>Bank</title>',styles:['/bank.css'],css:{'/bank.css':'.account-opening{color:navy}'},content:'<main class="account-opening">Opening your account</main>',entry:'/private-bank.js'}});document.body.append(nav);
 const load=vi.fn(async(_entry:string)=>{}),scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const originalDocument=document;
 try{
  // Only the module boundary is substituted: production history, DOM,
  // styles, activity events and focus all execute in the actual router.
  new Function('loadModule',source.replaceAll('import(', 'loadModule('))(load);
  document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();
  expect(location.pathname).toBe('/ledger/');
  const ledger=document.querySelector<HTMLElement>('[data-public-runtime="ledger"]');
  expect(ledger?.hidden).toBe(false);expect(ledger?.querySelector('h1')?.textContent).toBe('ledger');
  expect(document.documentElement.classList.contains('learn-surface')).toBe(false);
  expect(document.querySelector('style[data-public-page-style="ledger"]')).not.toBeNull();
  const self=ledger!.querySelector<HTMLAnchorElement>('a[href="/ledger/"]')!;
  const selfClick=new MouseEvent('click',{bubbles:true,cancelable:true});self.dispatchEvent(selfClick);
  expect(selfClick.defaultPrevented).toBe(true);expect(document.querySelector('[data-public-runtime="ledger"]')).toBe(ledger);
  const input=ledger!.querySelector('input')!;input.value='retained search';
  for(const next of ['explore','verify','conformance']){
   document.querySelector<HTMLAnchorElement>(`[data-public-runtime]:not([hidden]) a[href="/${next}/"]`)!.click();
   expect(location.pathname).toBe(`/${next}/`);expect(ledger!.hidden).toBe(true);
   expect(document.querySelector(`[data-public-runtime="${next}"]`)?.hasAttribute('inert')).toBe(false);
   expect(document.title).toBe(next);
  }
  document.querySelector<HTMLAnchorElement>('[data-public-runtime="conformance"] a[href="/ledger/"]')!.click();
  expect(document.querySelector('[data-public-runtime="ledger"]')).toBe(ledger);
  expect(ledger!.querySelector('input')).toBe(input);expect(input.value).toBe('retained search');
  expect(document).toBe(originalDocument);expect(load.mock.calls.map(call=>call[0])).toEqual(['/ledger.js','/explore.js','/verify.js','/conformance.js']);
  document.querySelector<HTMLAnchorElement>('[data-public-runtime="ledger"] a[href="/learn/"]')!.click();
  expect(document.querySelectorAll('[data-public-runtime]:not([hidden])')).toHaveLength(0);
  expect(document.querySelector('style[data-public-page-style]')).toBeNull();
  // A workspace already loaded through an ordinary document entry also
  // returns without importing or replacing its existing input.
  history.replaceState({},'', '/ledger/');dispatchEvent(new PopStateEvent('popstate'));
  expect(ledger!.hidden).toBe(false);expect(ledger!.querySelector('input')).toBe(input);
  expect(load).toHaveBeenCalledTimes(4);
  const shared=document.createElement('a');shared.href=`/verify/${'a'.repeat(64)}/`;ledger!.append(shared);
  const sharedClick=new MouseEvent('click',{bubbles:true,cancelable:true});shared.dispatchEvent(sharedClick);
  expect(sharedClick.defaultPrevented).toBe(true);expect(location.pathname).toBe(`/verify/${'a'.repeat(64)}/`);
  expect(document.querySelector('[data-public-runtime="verify"]')?.hasAttribute('hidden')).toBe(false);
  document.querySelector<HTMLAnchorElement>('[data-public-runtime="verify"] a[href="/ledger/"]')!.click();
  expect(location.pathname).toBe('/ledger/');expect(load).toHaveBeenCalledTimes(4);
  history.pushState({bankReceipt:true},'', '/receipt/#r=fixture');dispatchEvent(new Event('bankeiz:receipt'));
  expect(document.querySelector('[data-public-runtime="receipt"]')?.hasAttribute('hidden')).toBe(false);
  expect(ledger!.hidden).toBe(true);expect(document.title).toBe('receipt');
  document.querySelector<HTMLAnchorElement>('[data-public-runtime="receipt"] a[href="/learn/"]')!.click();
  expect(location.pathname).toBe('/learn/');
  history.replaceState({bankReceipt:true},'', '/receipt/#r=fixture');dispatchEvent(new PopStateEvent('popstate'));
  expect(document.querySelector('[data-public-runtime="receipt"]')?.hasAttribute('hidden')).toBe(false);
  expect(load.mock.calls.filter(call=>call[0]==='/receipt.js')).toHaveLength(1);
  document.querySelector<HTMLAnchorElement>('[data-public-runtime="receipt"] a[href="/ledger/"]')!.click();
  const enter=document.createElement('a');enter.href='/';ledger!.append(enter);enter.click();
  expect(document.querySelector('#root .account-opening')?.textContent).toBe('Opening your account');
  expect(document.querySelector('style[data-bank-stylesheet="/bank.css"]')?.textContent).toContain('.account-opening');
  expect(document.querySelector('link[href="/bank.css"]')).toBeNull();
  expect(load.mock.calls.at(-1)?.[0]).toBe('/private-bank.js');
 }finally{scroll.mockRestore();}
});
