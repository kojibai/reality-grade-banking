import {useCallback, useEffect, useState, useSyncExternalStore} from 'react';
import {flushSync} from 'react-dom';
import {Sheet} from '../components/Sheet';
import {attachPublicAssetTrade, beginPublicAssetTrade, closePublicAssetTrade, readPublicAssetTrade, requestPublicAssetBankRuntime, subscribePublicAssetTrade} from '../receiz/public-asset-trade';
import {publicPurchaseAtLocation, publicPurchaseBudget} from '../receiz/public-purchase-checkpoint';
import './public-asset-trade.css';

/** Public UI owns the dialog; the retained BankApp supplies its account content. */
export function PublicAssetTradeHost() {
  const intent = useSyncExternalStore(subscribePublicAssetTrade, readPublicAssetTrade, () => null);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [checkpoint, setCheckpoint] = useState(publicPurchaseAtLocation);
  const id = intent?.id;
  const slot = useCallback((element: HTMLDivElement | null) => {if (id !== undefined) attachPublicAssetTrade(id, element);}, [id]);
  useEffect(() => {
    if (id === undefined) return;
    let alive = true; setError('');
    void requestPublicAssetBankRuntime().catch(() => {if (alive) setError('Your account could not open. Check your connection and try again.');});
    return () => {alive = false;};
  }, [id, attempt]);
  useEffect(() => {
    if (!intent) return;
    const leave = () => {if (location.pathname !== intent.pathname) flushSync(() => closePublicAssetTrade(intent.id));};
    addEventListener('popstate', leave); addEventListener('receiz-bank:surface', leave);
    return () => {removeEventListener('popstate', leave); removeEventListener('receiz-bank:surface', leave);};
  }, [intent?.id, intent?.pathname]);
  useEffect(() => () => {queueMicrotask(() => {if (id !== undefined && readPublicAssetTrade()?.id === id && !readPublicAssetTrade()?.slot) closePublicAssetTrade(id);});}, [id]);
  useEffect(() => {
    const read = () => setCheckpoint(publicPurchaseAtLocation());
    for (const name of ['popstate', 'hashchange', 'receiz-bank:surface', 'bankeiz:public-purchase-checkpoint']) addEventListener(name, read);
    return () => {for (const name of ['popstate', 'hashchange', 'receiz-bank:surface', 'bankeiz:public-purchase-checkpoint']) removeEventListener(name, read);};
  }, []);
  if (!intent) return checkpoint ? <aside className="public-purchase-resume"><p className="body-copy small-copy">Continue your saved purchase of {checkpoint.title}. Your account and current trade details will be checked before approval.</p><button className="secondary-button" onClick={() => beginPublicAssetTrade({itemId: checkpoint.itemId,...(checkpoint.certificateToken?{certificateToken:checkpoint.certificateToken}:{}), title: checkpoint.title, side: 'buy', initialBudget: publicPurchaseBudget(checkpoint), ...(checkpoint.view === 'deposit' ? {resumeSessionId: checkpoint.sessionId} : {resumeTradeReview:true})})}>{checkpoint.view === 'deposit' ? 'Check deposit and continue' : 'Continue purchase review'}</button></aside> : null;
  return <Sheet title={intent.side === 'buy' ? 'Buy ownership' : 'Sell ownership'} onClose={() => closePublicAssetTrade(intent.id)}>
    <p className="body-copy small-copy public-asset-trade-title">{intent.title}</p>
    {!intent.connected && (error ? <div role="status"><p className="error-message">{error}</p><button className="secondary-button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : <p className="body-copy" role="status">Opening your account…</p>)}
    <div className="public-asset-trade-slot" ref={slot}/>
  </Sheet>;
}
