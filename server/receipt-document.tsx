import {renderToString} from 'react-dom/server';
import {PublicDocumentFormatContext,PublicDocumentPulseContext,type PublicFirstFrame} from '../src/core/public-document-format';
import {ReceiptView} from '../src/features/receipts/ReceiptView';
import type {LedgerReceipt} from '../src/receiz/ledger-receipts';

/** Reuse the exact receipt already read. Rendering runs no component effects,
 * Source requests, account reads, signatures or financial commands. */
export function renderReceiptDocument(receipt:LedgerReceipt,href:string,frame:PublicFirstFrame){
 return renderToString(<PublicDocumentFormatContext.Provider value={frame}><PublicDocumentPulseContext.Provider value={frame.pulse}><ReceiptView active={false} initialReceipt={receipt} initialHref={href} onBack={()=>{}}/></PublicDocumentPulseContext.Provider></PublicDocumentFormatContext.Provider>,{identifierPrefix:'public-receipt-'});
}
