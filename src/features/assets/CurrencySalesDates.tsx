import { useContext } from 'react';
import { PublicDocumentFormatContext } from '../../core/public-document-format';
import type { NativeCurrencySalesWindow } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import { epochMsFromPulse, microPulsesSinceGenesis } from '../../../native/receiz/app/utils/kai_pulse';

function calendarDate(kaiUPulse: string) {
  const exact = BigInt(kaiUPulse);
  const epoch = epochMsFromPulse(exact / 1_000_000n);
  const base = microPulsesSinceGenesis(epoch);
  const perSecond = microPulsesSinceGenesis(epoch + 1_000n) - base;
  return new Date(Number(epoch) + Math.round(Number(exact - base) * 1000 / Number(perSecond)));
}

export function CurrencySalesDates({ window }: { window?: NativeCurrencySalesWindow }) {
  const format = useContext(PublicDocumentFormatContext);
  if (!window) return null;
  const date = new Intl.DateTimeFormat(format?.locale, {
    timeZone: format?.timeZone, year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  return <>
    {window.opensAtKaiUPulse && <div><span>Sales start</span><strong>{date.format(calendarDate(window.opensAtKaiUPulse))}</strong></div>}
    {window.closesAtKaiUPulse && <div><span>Sales end</span><strong>{date.format(calendarDate(window.closesAtKaiUPulse))}</strong></div>}
  </>;
}
