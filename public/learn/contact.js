// The existing personal booking document, retained in an in-place dialog.
// Opening it composes the same Twin, Calendar and payment paths as /book/bjklock/.
let dialog,opener,restoreOverflow;
export function openContact(from){
 opener=from??document.activeElement;
 if(!dialog){
  const style=document.createElement('style');style.textContent=".bank-contact-sheet{padding:0;border:1px solid #e1e6ed;border-radius:23px;width:min(500px,calc(100vw - 24px));height:min(790px,calc(100svh - 40px));max-height:calc(100svh - 40px);overflow:hidden;background:#fcfbf8;color:#172d48;box-shadow:0 35px 100px #11243f30}.bank-contact-sheet[open]{display:flex;flex-direction:column}.bank-contact-sheet::backdrop{background:#172d4838;backdrop-filter:blur(7px)}.bank-contact-sheet>header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e1e6ed;flex:none;font:500 13px/1.5 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.bank-contact-sheet>header button{width:35px;height:35px;display:grid;place-items:center;border:0;border-radius:50%;background:#edf0f5;color:#172d48;cursor:pointer}.bank-contact-sheet>iframe{flex:1;min-height:0;width:100%;border:0;background:#fcfbf8}.bank-contact-sheet :focus-visible{outline:2px solid #3154d2;outline-offset:3px}@media(max-width:540px){.bank-contact-sheet{height:calc(100svh - 24px);max-height:calc(100svh - 24px);border-radius:20px}}";document.head.append(style);
  dialog=document.createElement('dialog');dialog.className='bank-contact-sheet';dialog.setAttribute('aria-label','Contact BJ Klock');
  dialog.innerHTML='<header><span>Contact BJ Klock</span><button type="button" aria-label="Close contact panel"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><iframe title="BJ Klock’s booking and Twin" src="/book/bjklock/" allow="payment" referrerpolicy="same-origin"></iframe>';
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.documentElement.style.overflow=restoreOverflow??'';opener?.isConnected&&opener.focus({preventScroll:true});});
  document.body.append(dialog);
  addEventListener('receiz-learn:page',()=>{if(dialog.open)dialog.close();});
 }
 if(!dialog.open){restoreOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();}
}
