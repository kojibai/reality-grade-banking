import {expect,it,vi} from 'vitest';
import {fixture} from './fixtures/public-material-parts';
const mocks=vi.hoisted(()=>({source:vi.fn(),read:vi.fn(),recheck:vi.fn()}));
vi.mock('../server/public-market',()=>({readReceizPublicMarketSource:mocks.source}));
vi.mock('../server/prepared-public-material',()=>({preparedPublicMaterialSelection:()=>({read:mocks.read,recheck:mocks.recheck})}));
import {prepareSelectedPublicReferenceCatalog} from '../server/public-reference-state';
const rows=Array.from({length:3},(_,i)=>({id:`profile:alice:held-${i}`,receizId:`held-${i}`,ownerUserId:'owner',ownerUsername:'alice',title:'Held '+i,profileOriginal:{claim:'Exact retained Original '+i}}));
it('reuses the existing selected public response instead of reopening its retained profile/Original indexes',async()=>{
 const f=fixture(rows),canonical=await prepareSelectedPublicReferenceCatalog(f,false),reads:string[]=[];
 mocks.read.mockImplementation(async(id:string)=>{reads.push(id);if(![f.root.membership.metadata,f.root.snapshot.metadata].includes(id))throw Error('REDUNDANT_INDEX_OR_ORIGINAL_READ');return f.objects.get(id)!;});
 mocks.source.mockResolvedValue({ok:true,transport:{publicMembership:{version:1,source:'canonical-complete',scope:'whole-market-visible-showcase',isComplete:true,itemCount:3,revision:f.generation},publicOriginals:rows,publicProfileHeads:[]},snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:f.quotes}}});
 const next=await prepareSelectedPublicReferenceCatalog({material:f.material,generation:f.generation},false);
 expect(next.catalog).toEqual(canonical.catalog);expect(mocks.source).toHaveBeenCalledOnce();expect(new Set(reads)).toEqual(new Set([f.root.membership.metadata,f.root.snapshot.metadata]));
 const again=await prepareSelectedPublicReferenceCatalog({material:f.material,generation:f.generation},false);
 expect(again.catalog).toBe(next.catalog);expect(mocks.source).toHaveBeenCalledOnce();expect(mocks.recheck).toHaveBeenCalledWith(f.generation);
 mocks.recheck.mockRejectedValueOnce(Error('WITHDRAWN_SELECTED_FAMILY'));await expect(prepareSelectedPublicReferenceCatalog({material:f.material,generation:f.generation},false)).rejects.toThrow('WITHDRAWN_SELECTED_FAMILY');
});
it('refuses another selected generation rather than stamping its records into this saved family',async()=>{
 const f=fixture(rows.slice(0,1));mocks.source.mockResolvedValue({ok:true,transport:{publicMembership:{version:1,source:'canonical-complete',scope:'whole-market-visible-showcase',isComplete:true,itemCount:1,revision:'f'.repeat(64)},publicOriginals:rows.slice(0,1),publicProfileHeads:[]},snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:f.quotes}}});
 await expect(prepareSelectedPublicReferenceCatalog({material:f.material,generation:f.generation},false)).rejects.toThrow('PUBLIC_MATERIAL_SELECTION_CHANGED');
});
