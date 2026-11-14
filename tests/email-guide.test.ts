import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {createServer,type ViteDevServer} from 'vite';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';
import {parseRoute} from '../src/core/routes';
let server:ViteDevServer;
beforeAll(async()=>{server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});});
afterAll(async()=>{await server?.close();});
it('gives email a static guide while preserving the explicit profile and live personal booking routes',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 for(const source of ['/email','/email/'])expect(config.rewrites.find((row:{source:string})=>row.source===source)?.destination).toBe('/email/index.html');
 expect(profilePageUsername('/email/')).toBeNull();expect(profilePageUsername('/u/email/')).toBe('email');expect(profilePagePath('email')).toBe('/u/email/');
 expect(config.rewrites.find((row:{source:string;has?:unknown})=>row.source==='/book/:username/'&&!row.has)?.destination).toBe('/booking/index.html');
});
it('renders the actual Messages email, composer, identity and appointment leaves as held inert examples',async()=>{
 const {renderEmailExamples}=await import('../scripts/email-guide.mjs'),preview=await renderEmailExamples(server);
 expect(Object.keys(preview.screens)).toEqual(['conversation','incoming','reply','original','everyday']);
 expect(preview.screens.incoming).toContain('bank-email-message');expect(preview.screens.incoming).toContain('jamie@example.com');expect(preview.screens.reply).toContain('bank-message-own');expect(preview.screens.conversation).toContain('bank-message-composer');expect(preview.screens.everyday).toContain('bank-chat-meeting');expect(preview.screens.everyday).toContain('482 916');
 for(const html of Object.values(preview.screens)){expect(html).not.toMatch(/<(?:form|iframe|audio|video)\b/);expect(html).not.toMatch(/href="https?:|onClick=|src="https?:/);expect(html).toContain('data-email-example');}
 expect(preview.css).toContain('.email-guide-preview');
});
it('ships complete first-paint copy, precise names and connected booking without requiring a transport',async()=>{
 const {emailGuideContent,renderEmailExamples,emailGuidePage}=await import('../scripts/email-guide.mjs'),html=emailGuideContent(await renderEmailExamples(server));
 expect(emailGuidePage.path).toBe('/email/');for(const copy of ['Your username.','Your email.','Email outside.','Connected inside.','One address.','More of your day.','maya@receiz.com','18-character','receiz_','retained','unretained','Use your Receiz email today.','Connect your Receiz ID later.','When the app adds Receiz','assets/data you approve','changing an email address does not grant access','/book/','https://receiz.com/developers/receiz-connect#existing-accounts'])expect(html.toLowerCase()).toContain(copy.toLowerCase());
 expect(html).toContain('data-public-script="email"');expect(html).toContain('data-email-demo-bank');expect(html).toContain('bank-email-message');expect(html).not.toContain('<script type="module"');expect(html).not.toContain('generated_images');
 expect(html).toContain('href="/#account/messages"');expect(parseRoute('#account/messages')).toEqual({panel:'account',sheet:{kind:'messages'}});
 expect(readFileSync('scripts/build-public-pages.mjs','utf8')).toContain('emailGuideContent(emailExamples)');expect(readFileSync('scripts/public-page-metadata.mjs','utf8')).toContain('emailGuidePage');
});
