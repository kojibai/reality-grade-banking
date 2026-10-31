import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {createServer,type ViteDevServer} from 'vite';
let server:ViteDevServer;
beforeAll(async()=>{server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});});
afterAll(async()=>{await server?.close();});
it('gives the generic guide its own route while preserving personal booking and crawler routing',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 for(const source of ['/book','/book/'])expect(config.rewrites.find((r:{source:string})=>r.source===source)?.destination).toBe('/book/index.html');
 for(const source of ['/book/:username','/book/:username/']){
  const entries=config.rewrites.filter((r:{source:string})=>r.source===source);
  expect(entries.find((r:{has?:unknown})=>!r.has)?.destination).toBe('/booking/index.html');
  expect(entries.find((r:{has?:unknown})=>r.has)?.destination).toBe('/api/book?username=:username');
 }
 expect(config.functions['api/book.ts'].includeFiles).toContain('dist/booking/index.html');
 expect(readFileSync('booking/index.html','utf8')).toContain('/src/features/booking/main.tsx');
});
it('renders the actual appointment components as complete inert examples without a live account or transport',async()=>{
 const {renderBookingExamples}=await import('../scripts/booking-guide.mjs');
 const preview=await renderBookingExamples(server);
 expect(Object.keys(preview.screens)).toEqual(['guest-calendar','guest-offers','guest-twin','guest-confirmed','host-calendar','host-appointment','host-link','host-settings']);
 expect(preview.screens['guest-calendar']).toContain('booking-time-list');
 expect(preview.screens['guest-calendar']).toContain('Maya Chen');
 expect(preview.screens['guest-twin']).toContain('Maya has 2:00 PM available');
 expect(preview.screens['host-calendar']).toContain('Project review');
 expect(preview.screens['host-appointment']).toContain('Appointment price');
 for(const html of Object.values(preview.screens)){
  expect(html).not.toMatch(/<(?:form|audio|video|iframe)\b/);expect(html).not.toContain('onClick=');
  expect(html).not.toMatch(/href="https?:/);expect(html).toContain('data-booking-example');
 }
 expect(preview.css).toContain('.booking-guide-preview');
});
it('explains the complete real guest/host flow, optional Twin, payment and continuity without inventing services',async()=>{
 const {bookingGuideContent,renderBookingExamples,bookingGuidePage}=await import('../scripts/booking-guide.mjs');
 const html=bookingGuideContent(await renderBookingExamples(server));
 expect(bookingGuidePage.path).toBe('/book/');
 for(const text of ['Make time.','Choose a time','Free','per guest','shortfall','timezone','Business','Calendar only','invitation','meeting','Questions for your guest'])expect(html.toLowerCase()).toContain(text.toLowerCase());
 for(const href of ['/meet/','/guide/#calendar-booking','/your-twin/','/book/bjklock/'])expect(html).toContain('href="'+href+'"');
 expect(html).toContain('data-booking-guide');expect(html).toContain('data-public-script="book"');expect(html).toContain('data-booking-demo-bank');
 expect(html).not.toContain('<script type="module"');
});

it('shares the CSS scoper without importing an executable build into Vite config',()=>{expect(readFileSync('scripts/booking-guide.mjs','utf8')).toContain("from'./scope-product-css.mjs'");expect(readFileSync('scripts/scope-product-css.mjs','utf8')).not.toMatch(/createServer|process\.argv|ssrLoadModule/);});
