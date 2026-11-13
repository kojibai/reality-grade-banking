import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';

const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
const origin='https://bankeiz.com';

it('requests a separate installed app client instead of replacing an open draft or transaction',()=>{
 expect(manifest.launch_handler?.client_mode).toBe('navigate-new');
 expect(manifest.display).toBe('standalone');
});

it.each([
 '/?from=email#account/messages',
 '/bjklock/?from=social#originals',
 '/book/bjklock/?service=consultation#availability',
 '/receipt/?source=one%2Ftwo#r=exact%2Breceipt',
 '/verify/abcdef/?from=shared#proof',
 '/api/bank/native/email-message/start?token=synthetic%2Btoken&return=exact%2Fpath#destination',
 '/api/bank/native/email-meeting/start?token=synthetic%2Btoken&eventId=synthetic-event#destination',
])('keeps the complete HTTPS destination within the installed app scope: %s',destination=>{
 const scope=new URL(manifest.scope,origin+'/manifest.webmanifest'),target=new URL(destination,origin);
 expect(target.origin).toBe(scope.origin);
 expect(target.pathname.startsWith(scope.pathname)).toBe(true);
 expect(target.href).toBe(origin+destination);
 expect(new URL(manifest.id,origin).href).toBe(origin+'/');
 expect(new URL(manifest.start_url,origin).href).toBe(origin+'/');
});

it('keeps native Receiz URLs outside Bankeiz scope and leaves ordinary browser fallback available',()=>{
 const scope=new URL(manifest.scope,origin+'/manifest.webmanifest');
 expect(scope.origin).toBe(origin);
 expect(new URL('https://receiz.com/auth/continue?return=bank').origin).not.toBe(scope.origin);
 expect(manifest.scope_extensions).toBeUndefined();
 expect(manifest.protocol_handlers).toBeUndefined();
 expect(manifest.capture_links).toBeUndefined();
 expect(manifest.prefer_related_applications).not.toBe(true);
});
