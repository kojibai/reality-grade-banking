import {afterEach,expect,it,vi} from 'vitest';
import {readFile} from 'node:fs/promises';
import {bookingPreviewHtml,handleBookingPreview,createBookingOwnerReader} from '../server/booking-preview';
const owner={username:'alexmorgan',displayName:'Alex Morgan',avatarUrl:'https://receiz.com/artwork/alex.png'};
const page=async()=>'<html><head><title>Make time</title><meta name="description" content="old"></head><body><div id="root"></div><script type="module" src="/assets/booking.js"></script></body></html>';
afterEach(()=>vi.unstubAllGlobals());
it('serves personalized crawler metadata without loading the image renderer or changing the booking document',async()=>{
 const read=vi.fn(async()=>owner),image=vi.fn();const response=await handleBookingPreview(new Request('https://bankeiz.com/book/alexmorgan/?slotMinutes=30&utm_source=share',{headers:{'user-agent':'Twitterbot'}}),{owner:read,page,image});
 const html=await response.text();expect(response.status).toBe(200);expect(html).toContain('Meet with Alex Morgan');expect(html).toContain('content="summary_large_image"');expect(html).toContain('https://bankeiz.com/book/alexmorgan/og.png');expect(html).toContain('og:image:width" content="1730');expect(html).toContain('twitter:image:alt');expect(html).toContain('/assets/booking.js');expect(html).not.toContain('utm_source');expect(read).toHaveBeenCalledExactlyOnceWith('alexmorgan');expect(image).not.toHaveBeenCalled();
});
it('escapes names and keeps scheduling questions, availability and guest information out of metadata',async()=>{
 const html=bookingPreviewHtml(await page(),{...owner,displayName:'Alex </title><script>bad</script> & Co'});expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>bad');expect(html.match(/<title>/g)).toHaveLength(1);expect(html).not.toContain(owner.avatarUrl);expect(html).not.toContain('slots');
});
it('replaces the static fallback graph with the same personalized invitation as the social tags',async()=>{
 const fallback=(await page()).replace('</head>','<script type="application/ld+json">{"@type":"WebPage","name":"Make time | Bankeiz"}</script></head>');
 const html=bookingPreviewHtml(fallback,owner),graphs=[...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map(match=>JSON.parse(match[1]));
 expect(graphs).toHaveLength(1);expect(graphs[0]).toMatchObject({'@type':'WebPage',name:'Meet with Alex Morgan | Bankeiz',url:'https://bankeiz.com/book/alexmorgan/'});
 expect(graphs[0].primaryImageOfPage.url).toMatch(/^https:\/\/bankeiz.com\/book\/alexmorgan\/og.png\?v=/);
});
it.each(['/book/alexmorgan/og.png','/api/book?username=alexmorgan&image=1','/api/book/?username=alexmorgan&image=1'])('uses the same public owner for the PNG at %s',async path=>{
 const read=vi.fn(async()=>owner),image=vi.fn(async()=>new Uint8Array([137,80,78,71]));const response=await handleBookingPreview(new Request('https://bankeiz.com'+path),{owner:read,page,image});expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/png');expect(image).toHaveBeenCalledExactlyOnceWith(owner);expect(read).toHaveBeenCalledExactlyOnceWith('alexmorgan');
});
it.each(['/book/alexmorgan/','/book/alexmorgan/og.png'])('keeps HEAD probes free of source reads, template reads and rendering: %s',async path=>{
 const read=vi.fn(),template=vi.fn(),image=vi.fn();const response=await handleBookingPreview(new Request('https://bankeiz.com'+path,{method:'HEAD'}),{owner:read,page:template,image});expect(response.status).toBe(200);expect(await response.text()).toBe('');expect(read).not.toHaveBeenCalled();expect(template).not.toHaveBeenCalled();expect(image).not.toHaveBeenCalled();
});
it('refuses foreign selectors and mutation methods before accessing any public source',async()=>{
 const read=vi.fn(),image=vi.fn();for(const path of ['/book/alexmorgan/?username=foreign','/book/alexmorgan/?image=2','/book/alexmorgan/?url=https://internal.invalid','/api/book?username=alexmorgan&username=foreign'])expect((await handleBookingPreview(new Request('https://bankeiz.com'+path),{owner:read,page,image})).status).toBe(400);
 expect((await handleBookingPreview(new Request('https://bankeiz.com/book/alexmorgan/',{method:'POST'}),{owner:read,page,image})).status).toBe(405);expect(read).not.toHaveBeenCalled();expect(image).not.toHaveBeenCalled();
});
it('coalesces only concurrent owner reads and never forwards visitor credentials or scheduling controls',async()=>{
 const fetcher=vi.fn(async()=>Response.json({ok:true,owner,slots:[{private:'not projected'}]})),read=createBookingOwnerReader(fetcher);expect(await Promise.all([read('alexmorgan'),read('alexmorgan')])).toEqual([owner,owner]);expect(fetcher).toHaveBeenCalledOnce();const [url,init]=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(url).toBe('https://receiz.com/api/calendar/embed/alexmorgan');expect(init).toMatchObject({method:'GET',credentials:'omit',redirect:'error'});expect(new Headers(init.headers).has('cookie')).toBe(false);expect(new Headers(init.headers).has('authorization')).toBe(false);await read('alexmorgan');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('does not substitute a different owner or retain a portrait after public source refusal',async()=>{
 const read=createBookingOwnerReader(vi.fn(async()=>Response.json({ok:true,owner:{...owner,username:'someoneelse'}})));await expect(read('alexmorgan')).rejects.toThrow();
 const response=await handleBookingPreview(new Request('https://bankeiz.com/book/alexmorgan/og.png'),{owner:async()=>{throw Error('unavailable');},page,image:vi.fn()});expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store');
});
it('routes social crawlers and images while preserving the existing static path for normal visitors',async()=>{
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 for(const path of ['/book/:username/','/book/:username']){
  const routes=config.rewrites.filter((route:{source:string})=>route.source===path),shared=routes.find((route:{has?:unknown[]})=>route.has?.length),regular=routes.find((route:{has?:unknown[]})=>!route.has);
  expect(regular.destination).toBe('/booking/index.html');expect(shared.destination).toBe('/api/book?username=:username');const pattern=new RegExp(shared.has[0].value);
  for(const ua of ['Twitterbot/1.0','facebookexternalhit/1.1','WhatsApp/2.0','Applebot','LinkedInBot','TelegramBot','Slackbot-LinkExpanding'])expect(pattern.test(ua),ua).toBe(true);expect(pattern.test('Mozilla/5.0 Safari/605.1.15')).toBe(false);
 }
 expect(config.rewrites.find((route:{source:string})=>route.source==='/book/:username/og.png')?.destination).toBe('/api/book?username=:username&image=1');expect(config.functions['api/book.ts'].includeFiles).toContain('dist/booking/index.html');expect(config.functions['api/book.ts'].includeFiles).toContain('fonts');
});
