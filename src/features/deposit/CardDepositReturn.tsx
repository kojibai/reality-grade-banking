import { useEffect } from 'react';
import {publicPurchaseReturnLink} from '../../receiz/public-purchase-checkpoint';
export function readCardReturn(search: string): string | null {
  const query = new URLSearchParams(search); const session = query.get('session_id');
  return query.get('cardReturn') === '1' && query.getAll('session_id').length === 1 && /^cs_[a-zA-Z0-9_]{8,200}$/.test(session ?? '') ? session : null;
}
export function readCardResume(search:string):string|null{
 const query=new URLSearchParams(search),session=query.get('resumeCardSession');
 return query.getAll('resumeCardSession').length===1&&/^cs_[a-zA-Z0-9_]{8,200}$/.test(session??'')?session:null;
}
export const cardResumeLink=(sessionId:string)=>publicPurchaseReturnLink(sessionId)??`/?resumeCardSession=${encodeURIComponent(sessionId)}#account/deposit`;
// Provider return is only a signal to check Receiz. It opens no identity and
// cannot assert payment or settlement.
export function CardDepositReturn({ sessionId }: { sessionId: string }) {
  const assetReturn = publicPurchaseReturnLink(sessionId);
  useEffect(() => { if (window.parent !== window) window.parent.postMessage({ source: 'receiz-bank-card-return', type: 'checkout-returned', sessionId }, location.origin); }, [sessionId]);
  return <main className="entrance-content"><h1>Returning to your deposit.</h1><p className="body-copy">Your payment and Reserve credit will be checked when you return.</p><a className="primary-button" href={cardResumeLink(sessionId)} target="_top">{assetReturn?'Return to this asset':'Return to my account'}</a></main>;
}
