import { expect, it, vi } from 'vitest';
import { readSharedPublicSource, parsePublicNetworkRequest } from '../server/public-network';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {groupLedgerPaymentRecords} from '../src/receiz/ledger-payment-records';
import {createHash} from 'node:crypto';
it('permits only the shared public source families and bounded cursors', () => {
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=actions&cursor=42')).toEqual({ source: 'actions', cursor: '42' });
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=wallet&url=https://evil.test')).toBeNull();
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=private')).toBeNull();
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=graph&cursor=42')).toBeNull();
  expect(parsePublicNetworkRequest('/api/bank/public-network?source=wallet&cursor=' + 'a'.repeat(2049))).toBeNull();
});
it('permits a bounded publication freshness hint only for the public proof collection',()=>{
 const digest='a'.repeat(64),path='/api/bank/public-network?source=proofs&afterPublication='+digest;
 expect(parsePublicNetworkRequest(path)).toEqual({source:'proofs',afterPublication:digest});
 for(const bad of [path+'&afterPublication='+digest,path.replace(digest,'invalid'),path.replace('source=proofs','source=wallet'),path+'&cursor=next'])expect(parsePublicNetworkRequest(bad)).toBeNull();
});
it('refreshes Ledger proofs past cached pre-publication membership without sending private authority or adding an upstream query',async()=>{
 vi.resetModules();const {readSharedPublicSource:read}=await import('../server/public-network');
 const request=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ok:true,transport:{publicMembership:{},publicOriginals:[]}})).mockResolvedValueOnce(Response.json({ok:true,transport:{publicMembership:{},publicOriginals:[{id:'published-original',receizId:'published-original',title:'Published Original'}]}}));vi.stubGlobal('fetch',request);
 try{
  await read('proofs');
  const fresh=await read('proofs',undefined,'b'.repeat(64)) as {transport:{publicOriginals:{id:string}[]}};
  expect(fresh.transport.publicOriginals[0].id).toBe('published-original');
  expect(request).toHaveBeenCalledTimes(2);expect(String(request.mock.calls[1][0])).toBe('https://receiz.com/api/market/public-membership');expect(request.mock.calls[1][1]).toMatchObject({credentials:'omit',redirect:'error',cache:'no-store'});
  expect((await read('proofs'))).toEqual(fresh);expect(request).toHaveBeenCalledTimes(2);
 }finally{vi.unstubAllGlobals();}
});
it('joins each new public transfer to its exact execution using the existing single source response',async()=>{
 const transferId='7493d3ac-882e-4bc7-92e4-73d914580a30',alias='tx:'+createHash('sha256').update('wallet_public_ledger:transfer:'+transferId).digest('hex').slice(0,24);
 const action={id:'action',actionKind:'wallet.transfer.connect',transferId,amountUsdCents:'2700'};
 const request=vi.fn<typeof fetch>(async()=>Response.json({ok:true,actions:[action],nextCursor:null}));vi.stubGlobal('fetch',request);
 try{
  const raw=await readSharedPublicSource('actions');
  const movements=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'movement',kind:'chat_transfer',transferId:alias,amountUsdCents:'2700'}]}).records;
  const actions=parsePublicNetworkPage('actions',raw).records;
  expect(groupLedgerPaymentRecords([...actions,...movements])).toEqual([{record:movements[0],executionRecords:actions}]);
  expect(actions[0].evidence.transferId).toBe(transferId);expect(request).toHaveBeenCalledOnce();
  expect(action).not.toHaveProperty('publicTransferId');
 }finally{vi.unstubAllGlobals();}
});
