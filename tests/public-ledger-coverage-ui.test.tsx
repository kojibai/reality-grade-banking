// @vitest-environment happy-dom
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {parsePublicNetworkPage,PUBLIC_SOURCES,type PublicSource} from '../src/receiz/public-network';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';
const held=vi.hoisted(()=>({ledger:{} as Record<string,unknown>}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>held.ledger}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
vi.mock('../src/public-ledger/LedgerProofControls',()=>({LedgerProofControls:()=>null}));
function ledger(represented:readonly PublicSource[],incomplete:readonly PublicSource[]){
 const records=represented.map(source=>({...parsePublicNetworkPage('actions',{ok:true,actions:[{id:source,actionKind:'record',pulse:100}]}).records[0],source,id:`${source}:${source}`}));
 held.ledger={records,sources:Object.fromEntries(PUBLIC_SOURCES.map(source=>[source,{status:incomplete.includes(source)?'stale':'live',complete:!incomplete.includes(source),busy:false,cursor:null,error:null}])),bootstrap:false,capturedAt:null,refresh:()=>{},loadMore:()=>{}};
 const doc=new DOMParser().parseFromString(renderToStaticMarkup(<PublicLedgerApp/>),'text/html');
 return [...doc.querySelectorAll('.public-ledger-summary>div')].find(node=>node.querySelector('span')?.textContent==='Source coverage')!.querySelector('strong')!.textContent!.replace(/\s/g,'');
}
it('counts all four represented feeds even when a refresh has only partially read two of them',()=>{
 expect(ledger(PUBLIC_SOURCES,['graph','proofs'])).toBe('4/4');
});
it('does not count an unavailable feed with no retained records',()=>{
 expect(ledger(['actions','wallet','graph'],['proofs'])).toBe('3/4');
});
it('counts a successfully read empty feed without inventing records',()=>{
 expect(ledger([],[])).toBe('4/4');
});
