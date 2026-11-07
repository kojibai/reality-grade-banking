// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {RECEIVING_MESSAGE,receivingInvitationUrl,readReceivingInvitation} from '../src/adoption/invitation';
// @ts-expect-error Static public template is plain ESM.
import {receivingContent,invitationContent} from '../scripts/receiving-page.mjs';
import {init} from '../src/adoption/receiving-public';
const payload={schema:'bankeiz.receiving-invitation.v1' as const,message:RECEIVING_MESSAGE,senderName:'A unique sender' ,institution:{name:'Example institution',id:'example'},amountUsdCents:'25000',purpose:'Reviewed invoice 1048'};
const render=(hash='')=>{document.body.innerHTML=receivingContent();history.replaceState({publicNavigation:{url:'/receiving/'+hash}},'', '/receiving/'+hash);init();return document.querySelector<HTMLElement>('[data-receiving]')!;};
afterEach(()=>{document.querySelector<HTMLButtonElement>('[data-receiving-clear]')?.click();document.body.innerHTML='';vi.restoreAllMocks();vi.unstubAllGlobals();history.replaceState(null,'','/');});
it('has useful direct receiving on static first paint with optional institutional depth',()=>{
 const html=receivingContent();expect(html).toContain('href="/#account/receive"');expect(html).toContain('Receive directly.');expect(html).toContain('Receiving for an institution?');expect(html).not.toContain(payload.senderName);expect(html).not.toContain('25000');expect(html).not.toContain(payload.purpose);
});
it('offers independent receiving before an optional Bankeiz path on static first paint',()=>{
 document.body.innerHTML=receivingContent();
 const hero=document.querySelector('.receiving-hero')!,primary=hero.querySelector<HTMLAnchorElement>('.learn-button')!;
 expect(primary.textContent).toContain('Choose your receiving path');expect(primary.getAttribute('href')).toBe('#receiving-paths');
 const choices=document.querySelector('#receiving-paths')!,independent=choices.querySelector<HTMLAnchorElement>('[data-receiving-path="independent"]')!,bankeiz=choices.querySelector<HTMLAnchorElement>('[data-receiving-path="bankeiz"]')!;
 expect(independent.getAttribute('href')).toBe('#independent-receiving');expect(independent.textContent).toContain('Your application or institution');expect(bankeiz.getAttribute('href')).toBe('/#account/receive');
 expect(hero.textContent).toContain('your own conforming application or institution');
});
it('explains actual independent acceptance and onward use with existing implementation links, separate from inspection',()=>{
 document.body.innerHTML=receivingContent();const section=document.querySelector('#independent-receiving')!;
 expect(section.querySelectorAll('[data-receiving-independent-step]')).toHaveLength(4);
 for(const term of ['identity','current head','atomic','recovery','receiveSettlement','receiveReserve','onward'])expect(section.textContent).toContain(term);
 const links=[...section.querySelectorAll<HTMLAnchorElement>('a')].map(link=>link.getAttribute('href'));
 for(const path of ['institution/README.md','institution/digital-payments.md','institution/examples/edge-payments.ts','docs/note-continuity-standard.md'])expect(links).toContain('https://github.com/kojibai/reality-grade-banking/blob/main/'+path);
 expect(section.textContent).toContain('An inspector verifies the carried evidence');expect(section.textContent).toContain('accepts the financial transition');
 expect(section.querySelector('input,button')).toBeNull();
});
it('opens a dedicated personal invitation with sender profile and reviewed context locally',()=>{
 const fetch=vi.spyOn(globalThis,'fetch'),personal={...payload,senderName:'Mira Lane',senderUsername:'mira',recipientName:'Alex Stone'};
 document.body.innerHTML=invitationContent();history.replaceState({private:'must be removed'},'','/invitation/'+new URL(receivingInvitationUrl(personal)).hash);init();
 const root=document.querySelector<HTMLElement>('[data-receiving-invitation-page]')!;
 expect(root.querySelector<HTMLElement>('[data-receiving-invitation]')!.hidden).toBe(false);expect(root.querySelector<HTMLElement>('[data-receiving-entry]')!.hidden).toBe(true);
 expect(root.querySelector('[data-receiving-recipient]')?.textContent).toContain('Alex Stone');expect(root.querySelector('[data-receiving-sender]')?.textContent).toContain('Mira Lane');
 const profile=root.querySelector<HTMLAnchorElement>('[data-receiving-sender-profile]')!;expect(profile.getAttribute('href')).toBe('/u/mira/');expect(profile.textContent).toContain('@mira');
 expect(root.querySelector('[data-receiving-details]')?.textContent).toContain('$250.00');expect(root.querySelector('[data-receiving-message]')?.textContent).toBe(RECEIVING_MESSAGE);
 const assessment=root.querySelector<HTMLAnchorElement>('[data-receiving-assess]')!;expect(new URL(assessment.href).pathname).toBe('/conformance/');expect(readReceivingInvitation(new URL(assessment.href).hash)).toEqual({schema:'bankeiz.receiving-invitation.v1',message:RECEIVING_MESSAGE,institution:personal.institution});
 expect(root.querySelectorAll('[data-receiving-independent-step]')).toHaveLength(4);expect(root.textContent).toContain('atomic');expect(location.hash).toBe('');expect(history.state).toBeNull();expect(fetch).not.toHaveBeenCalled();
 expect(document.title).not.toContain('Mira Lane');expect(root.querySelector('[data-receiving-path="bankeiz"]')?.getAttribute('href')).toBe('/#account/receive');
});
it('keeps missing or malformed invitations as an honest receiving entrance without personal claims',()=>{
 document.body.innerHTML=invitationContent();history.replaceState(null,'','/invitation/');init();let root=document.querySelector<HTMLElement>('[data-receiving]')!;
 expect(root.querySelector<HTMLElement>('[data-receiving-entry]')!.hidden).toBe(false);expect(root.querySelector<HTMLElement>('[data-receiving-invitation]')!.hidden).toBe(true);
 history.replaceState(null,'','/invitation/#invite=not-valid');init();root=document.querySelector<HTMLElement>('[data-receiving]')!;
 expect(root.querySelector<HTMLElement>('[data-receiving-entry]')!.hidden).toBe(false);expect(root.querySelector('[data-receiving-message]')?.textContent).toBe('');expect(root.querySelector('[data-receiving-entry] [role=status]')?.textContent).toContain('could not be read');expect(location.hash).toBe('');
});
it('reads only the reviewed fragment locally, clears its URL/state and retains it on internal return',()=>{
 const network=vi.spyOn(globalThis,'fetch'),hash=new URL(receivingInvitationUrl(payload)).hash,root=render(hash);
 expect(location.hash).toBe('');expect(history.state).toBeNull();expect(root.querySelector('[data-receiving-message]')?.textContent).toBe(RECEIVING_MESSAGE);expect(root.querySelector('[data-receiving-details]')?.textContent).toContain('$250.00');expect(root.querySelector('[data-receiving-details]')?.textContent).toContain('Example institution');
 document.body.innerHTML=receivingContent();init();expect(document.querySelector('[data-receiving-message]')?.textContent).toBe(RECEIVING_MESSAGE);expect(network).not.toHaveBeenCalled();expect(document.title).not.toContain(payload.senderName);
 const assessment=document.querySelector<HTMLAnchorElement>('[data-receiving-assess]')!,context=readReceivingInvitation(new URL(assessment.href).hash);expect(new URL(assessment.href).pathname).toBe('/conformance/');expect(context).toEqual({schema:'bankeiz.receiving-invitation.v1',message:RECEIVING_MESSAGE,institution:payload.institution});expect(JSON.stringify(context)).not.toContain(payload.senderName);expect(JSON.stringify(context)).not.toContain(payload.purpose);expect(JSON.stringify(context)).not.toContain(payload.amountUsdCents);
});
it('renders invitation strings as text and refuses malformed/private payloads without an account or request',()=>{
 const message='<img src="https://attacker.invalid/x" onerror="alert(1)">',hash=new URL(receivingInvitationUrl({...payload,message})).hash,root=render(hash);expect(root.querySelector('[data-receiving-message]')?.textContent).toBe(message);expect(root.querySelector('img')).toBeNull();
 render('#invite=not-valid');expect(location.hash).toBe('');expect(document.querySelector('[data-receiving-message]')?.textContent).toBe('');expect(document.querySelector('[data-receiving-status]')?.textContent).toContain('receive directly');
 const privatePayload=Buffer.from(JSON.stringify({...payload,email:'private@example.test'}),'utf8').toString('base64url');render('#invite='+privatePayload);expect(document.body.textContent).not.toContain('private@example.test');
});
it('makes a user-selected public receiving response text only, with native keyboard form submission',async()=>{
 const writeText=vi.fn(async(_value:string)=>{});vi.stubGlobal('navigator',{clipboard:{writeText}});const root=render(),input=root.querySelector<HTMLInputElement>('[data-receiving-coordinate]')!,form=root.querySelector<HTMLFormElement>('form')!;
 input.value='alex.receiz.id';input.dispatchEvent(new Event('input',{bubbles:true}));expect(root.querySelector<HTMLButtonElement>('[data-receiving-copy]')!.disabled).toBe(false);form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await vi.waitFor(()=>expect(writeText).toHaveBeenCalledOnce());expect(writeText.mock.calls[0][0]).toContain('alex.receiz.id');expect(root.querySelector('[data-receiving-status]')?.textContent).toContain('Copied');
 input.value='https://attacker.invalid/pay/alex/';input.dispatchEvent(new Event('input',{bubbles:true}));expect(root.querySelector<HTMLButtonElement>('[data-receiving-copy]')!.disabled).toBe(true);expect(writeText).toHaveBeenCalledOnce();
});
it('keeps invitation payloads out of router history and prepared page data without changing ordinary URLs',()=>{
 document.body.innerHTML='<div id="root"><a id="invite" href="/receiving/#invite=secret">Invite</a></div>';const data=document.createElement('script');data.id='receiz-navigation';const pages={'/receiving/':{title:'Receiving',head:'<title>Receiving</title>',content:'<main><h1>Receive directly</h1><a href="/learn/#guides">Guides</a></main>'},'/learn/':{title:'Learn',head:'<title>Learn</title>',content:'<main>Learn</main>'}};data.textContent=JSON.stringify({pages,bank:{styles:[],head:'<title>Bank</title>',entry:'/unused.js'}});document.body.append(data);history.replaceState(null,'','/#account');
 const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{}),source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];new Function('window','document','location','history','scrollTo','Event','URL',source)(window,document,location,history,scroll,Event,URL);
 document.querySelector<HTMLAnchorElement>('#invite')!.click();expect(location.hash).toBe('#invite=secret');expect(history.state.publicNavigation.url).toBe('/receiving/');expect(JSON.stringify(pages)).not.toContain('secret');document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();expect(history.state.publicNavigation.url).toBe('/learn/#guides');
});

it('leaves another mounted workspace’s invitation for its own reader',()=>{document.body.innerHTML=receivingContent();history.replaceState(null,'','/conformance/#invite=retained-for-conformance');init();expect(location.hash).toBe('#invite=retained-for-conformance');expect(document.querySelector('[data-receiving-invitation]')?.hasAttribute('hidden')).toBe(true);});

it('forwards only institution context to assessment, excluding the reviewed personal message',()=>{const root=render(new URL(receivingInvitationUrl({...payload,message:'Personal reviewed message.'})).hash),href=root.querySelector<HTMLAnchorElement>('[data-receiving-assess]')!.href;expect(readReceivingInvitation(new URL(href).hash)).toEqual({schema:'bankeiz.receiving-invitation.v1',message:RECEIVING_MESSAGE,institution:payload.institution});expect(href).not.toContain('Personal');});
it('keeps a cancelled native share quiet and offers visible copy fallback for a real share failure',async()=>{
 const share=vi.fn().mockRejectedValueOnce(new DOMException('User cancelled','AbortError')).mockRejectedValueOnce(new Error('private device share failure')),writeText=vi.fn();vi.stubGlobal('navigator',{share,clipboard:{writeText}});const root=render(),input=root.querySelector<HTMLInputElement>('[data-receiving-coordinate]')!,button=root.querySelector<HTMLButtonElement>('[data-receiving-share]')!,status=root.querySelector<HTMLElement>('[data-receiving-status]')!,output=root.querySelector<HTMLTextAreaElement>('[data-receiving-response]')!;input.value='alex.receiz.id';input.dispatchEvent(new Event('input',{bubbles:true}));expect(button.hidden).toBe(false);button.click();await vi.waitFor(()=>expect(share).toHaveBeenCalledTimes(1));expect(status.textContent).toBe('');expect(output.hidden).toBe(true);button.click();await vi.waitFor(()=>expect(status.textContent).toContain('Copy your response below'));expect(output.hidden).toBe(false);expect(output.value).toContain('alex.receiz.id');expect(document.body.textContent).not.toContain('private device share failure');expect(writeText).not.toHaveBeenCalled();
});

it('returns focus to the visible invitation entrance when its personal brief is closed',()=>{document.body.innerHTML=invitationContent();history.replaceState(null,'','/invitation/'+new URL(receivingInvitationUrl(payload)).hash);init();const close=document.querySelector<HTMLButtonElement>('[data-receiving-clear]')!;close.focus();close.click();const entry=document.querySelector<HTMLElement>('[data-receiving-entry]')!;expect(entry.hidden).toBe(false);expect(document.activeElement).toBe(entry.querySelector('h1'));expect(document.querySelector<HTMLElement>('[data-receiving-invitation]')!.hidden).toBe(true);});

it('copies only the complete invitation URL after the address is scrubbed, with no lookup',async()=>{const writeText=vi.fn(async(_value:string)=>{});vi.stubGlobal('navigator',{clipboard:{writeText}});const fetch=vi.spyOn(globalThis,'fetch'),url=receivingInvitationUrl(payload);document.body.innerHTML=invitationContent();history.replaceState(null,'','/invitation/'+new URL(url).hash);init();expect(location.hash).toBe('');document.querySelector<HTMLButtonElement>('[data-receiving-copy-link]')!.click();await vi.waitFor(()=>expect(writeText).toHaveBeenCalledExactlyOnceWith(url));expect(document.querySelector('[data-receiving-link-status]')?.textContent).toContain('copied');expect(fetch).not.toHaveBeenCalled();});
