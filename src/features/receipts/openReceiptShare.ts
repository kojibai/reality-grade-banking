import type {LedgerReceipt} from '../../receiz/ledger-receipts';
let revision=0,activeClose:(()=>void)|null=null;
/** Dynamic import and full capture happen only after the user's share intent. */
export function openReceiptShare(capture:()=>LedgerReceipt,carriedLink?:string,onCopied?:()=>void,readyUrl?:string){
 const requested=++revision;activeClose?.();
 void Promise.all([import('react-dom/client'),import('react'),import('./ReceiptShare')]).then(([{createRoot},{createElement},{ReceiptShare}])=>{
  if(requested!==revision)return;const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const close=()=>{root.unmount();host.remove();if(activeClose===close)activeClose=null;};activeClose=close;root.render(createElement(ReceiptShare,{receipt:capture(),carriedLink,onCopied,readyUrl,onClose:close}));
 });
}
