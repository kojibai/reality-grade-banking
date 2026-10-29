// Delayed code-import boundary for scheduling tests. No original is admitted
// through this fixture; browser qualification uses the unchanged native runtime.
globalThis.__bankKitLoadStarted?.();
await globalThis.__bankKitLoadGate;
globalThis.ReceizOfflineVerifier={materials:{},sha256Hex:async value=>{
 const bytes=typeof value==='string'?new TextEncoder().encode(value):value;
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}};
