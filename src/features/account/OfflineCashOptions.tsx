import type {WalletBalanceNotice} from './wallet-balance-notice';
import './wallet-balance-notice.css';

export function OfflineCashOptions({notice,canSendNearby,onSendNearby}:{notice:WalletBalanceNotice;canSendNearby:boolean;onSendNearby?:()=>void}){
  return <aside className="wallet-balance-notice">
    <header role="status">
      {notice.support&&canSendNearby
        ?<><strong>Pay nearby with your balance</strong><p>Share a payment QR while you’re offline. The recipient can save it and spend it after they connect to confirm. You can stay offline.</p></>
        :<><strong>{notice.title}</strong><p>{notice.message}</p></>}
    </header>
    {notice.support&&canSendNearby&&onSendNearby&&<button type="button" className="secondary-button" onClick={onSendNearby}>Send nearby</button>}
    {notice.support&&<details><summary>Offline Cash setup options</summary>
      <p>Offline Cash lets people with compatible devices receive and spend it again while they’re still offline.</p>
      {canSendNearby&&<p><strong>{notice.title}</strong> {notice.message}</p>}
      <ul>
        <li>Try your device’s built-in authenticator in an up-to-date browser, or <a href="/conformance/#device-evidence">check a device or NFC security key</a> you already have. The check shows what the authenticator provides.</li>
        <li>Ask your browser or device provider to support {notice.support.requirement}. <a href="/conformance/#request-platform-support">See the platform requirements</a>.</li>
        <li>The Bankeiz Android app is in testing. A Bankeiz app for iPhone is planned.</li>
      </ul>
      <p className="small-copy">Reference code <code>{notice.support.code}</code></p>
    </details>}
    {notice.bankeizHelp&&<a href="/help/">Bankeiz help</a>}
  </aside>;
}
