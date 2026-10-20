import {resolve} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import type {LedgerReceipt} from '../src/receiz/ledger-receipts';
import {receiptPreviewText} from './receipt-preview';

const fontFiles=['Inter-SemiBold.ttf','Inter-Regular.ttf'].map(name=>resolve('scripts/social/fonts',name));
export async function renderReceiptImage(receipt:LedgerReceipt):Promise<Uint8Array>{
 const {amount,title,parties,time,valueLabel}=receiptPreviewText(receipt);
 const sizes=[amount,title].map(line=>Math.min(108,Math.max(24,Math.floor(1470/line.length))));
 let svg=shareCardSvg({lines:[amount,title],caption:parties.length>56?parties.slice(0,55)+'…':parties||'Receipt · Source record',motif:'receipt',sizes});
 const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 svg=svg.replace('<g font-family="Inter SemiBold" fill="#09203f"',`<text x="77" y="318" font-family="Inter" font-size="21" letter-spacing="2" fill="#64748b">${escape(valueLabel.toUpperCase())}</text><g font-family="Inter SemiBold" fill="#09203f"`);
 svg=svg.replace('<text x="77" y="778"',`<text x="77" y="716" font-family="Inter" font-size="26" fill="#64748b">${escape(time)}</text><text x="77" y="778"`);
 return new Resvg(svg,{font:{fontFiles,loadSystemFonts:false}}).render().asPng();
}
