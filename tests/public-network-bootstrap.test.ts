import {expect,it} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {restorePublicNetworkRows} from '../src/receiz/public-network-bootstrap';
it('upgrades an older complete cache with existing public context while preserving newer values and withdrawals',()=>{
 const records=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'one',receizId:'one',title:'One',valueUsd:10,ownerUsername:'artist'},{id:'withdrawn',receizId:'withdrawn',title:'Removed',valueUsd:20}]}}).records;
 const seed={records,capturedAt:null,inspectionVersion:1,coverage:[{source:'proofs' as const,complete:true}]};
 const cache={records:[{...records[0],details:undefined,valueOperands:{proofValueUsdCents:'1200'}}],capturedAt:null,coverage:[{source:'proofs' as const,complete:true}]};
 const restored=restorePublicNetworkRows(cache,seed);
 expect(restored).toHaveLength(1);expect(restored[0].details).toMatchObject({owner:{username:'artist'}});expect(restored[0].valueOperands?.proofValueUsdCents).toBe('1200');
});
it('does not join context from a different original digest',()=>{
 const [record]=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'one'}]}).records;
 const seed={records:[{...record,evidence:{artifactDigest:'old'},details:{objectId:'wrong'}}],capturedAt:null,coverage:[]};
 const cache={records:[{...record,evidence:{artifactDigest:'new'}}],capturedAt:null,coverage:[]};
 expect(restorePublicNetworkRows(cache,seed)[0].details).toEqual({});
});
