import { AndroidDownloadLink } from './AndroidDownloadLink';
import type {WalletBalanceNotice} from './wallet-balance-notice';
import './wallet-balance-notice.css';

export function OfflineCashOptions({notice,canSendNearby,onSendNearby}:{notice:WalletBalanceNotice;canSendNearby:boolean;onSendNearby?:()=>void}){
  const sendNearby = canSendNearby && onSendNearby && (notice.offerNearby || notice.support) ? onSendNearby : undefined;
  return <aside className="wallet-balance-notice">
    <header role="status">
      {sendNearby
        ?<><strong>Pay nearby with your balance</strong><p>Share a payment QR while you’re offline. The recipient can save it offline and spend it after they connect to confirm. You can stay offline.</p></>
        :<><strong>{notice.title}</strong><p>{notice.message}</p></>}
    </header>
    {sendNearby&&<button type="button" className="secondary-button" onClick={sendNearby}>Send nearby</button>}
    {notice.support&&<AndroidDownloadLink className="wallet-android-download"/>}
    {(sendNearby||notice.support)&&<details><summary>{notice.support?'Offline Cash setup options':'Offline Cash setup details'}</summary>
      {sendNearby&&<p><strong>{notice.title}</strong> {notice.message}</p>}
      {notice.support&&<>
        <p>Offline Cash lets people with compatible devices receive and spend it again while they’re still offline.</p>
        <ul>
          <li>Try your device’s built-in authenticator in an up-to-date browser, or <a href="/conformance/#device-evidence">check a device or NFC security key</a> you already have. The check shows what the authenticator provides.</li>
          <li>Ask your browser or device provider to support {notice.support.requirement}. <a href="/conformance/#request-platform-support">See the platform requirements</a>.</li>
          <li>A Bankeiz app for iPhone is planned.</li>
        </ul>
        <p className="small-copy">Reference code <code>{notice.support.code}</code></p>
      </>}
    </details>}
    {notice.bankeizHelp&&!sendNearby&&<a href="/help/">Bankeiz help</a>}
  </aside>;
}
