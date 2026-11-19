import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CollectibleActivity} from '../src/observatory/CollectibleActivity';
import {observeCatalog,growthSeries} from '../src/observatory/catalog';
import {collectibleActivity} from '../src/observatory/collectible-transfers';
import type {PublicRecord} from '../src/receiz/public-network';
import {walletActivity} from '../src/observatory/wallet';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import archive from '../src/observatory/audience-observations.json';
describe('Observatory directory, audience and wallet coverage',()=>{
  it('preserves the combined total when a partial release repeats a disjoint group of accounts',()=>{
    const owner=archive.find(row=>row.at==='2026-08-15T07:15:54.884Z')!;
    const directory=archive.find(row=>row.at==='2026-08-15T07:35:59.439Z')!;
    expect(owner.reported.views).toEqual({value:82186,covered:1});
    expect(directory.reported.views).toEqual({value:4306,covered:159});
    expect(directory.views).toEqual({value:86492,covered:160});
    for(const metric of ['views','plays','seconds'] as const)expect(owner[metric]).toEqual(directory[metric]);
  });
  it('includes a card with no Originals, keeps unknown attention blank, and honors an owner-bound refusal',()=>{
    const profile={userId:'00000000-0000-4000-aaaa-000000000001',username:'public_card',displayName:'Card',isPrivate:false,createdAt:'2026-01-01'};
    const catalog={...parsePublicMarket({ok:true,transport:{publicOriginals:[],publicProfileHeads:[{profile,viewer:{canView:true},unavailableDecorators:['profile-details']}]}}),complete:true};
    expect(observeCatalog(catalog).profiles).toMatchObject([{username:'public_card',stats:{originals:0,seconds:null}}]);
    expect(observeCatalog({...catalog,publicProfileHeadRefusals:[{profile:{userId:profile.userId,username:profile.username},viewer:{canView:false}}]}).profiles).toHaveLength(0);
  });
  it('covers the full span of dated observations and excludes undated entries',()=>{
    const series=growthSeries(['2025-02-01',null,'2025-02-01','2026-11-12']);
    expect(series?.points[0].count).toBe(2);
    expect(series?.points.at(-1)?.count).toBe(3);
    expect(series?.last).toBe(Date.parse('2026-11-12'));
  });
  it('places additions on their actual UTC dates across empty months and year boundaries',()=>{
    const series=growthSeries(['2024-05-10','2026-07-31T23:00:00Z','2026-08-01T01:00:00+02:00','2026-11-18','invalid',null])!;
    expect(series.points).toEqual([
      {at:Date.parse('2024-05-10'),count:1},{at:Date.parse('2026-07-31'),count:3},{at:Date.parse('2026-11-18'),count:4},
    ]);
    expect(series.months).toEqual([['2026-11',1],['2026-07',2],['2024-05',1]]);
  });
  it('deduplicates evidenced wallet aliases and separates transfer volume from minted and claimed notes',()=>{
    const uid='123456789ABCDEFGHJKLMNPQRSTUVW',other='987654321ABCDEFGHJKLMNPQRSTUVW';
    const {records}=parsePublicNetworkPage('wallet',{ok:true,rows:[{id:'transfer',kind:'chat_transfer',createdAt:'2026-11-01',amountUsdCents:'120',sender:{userId:uid},recipient:{userId:other}},{id:'mint',kind:'note_mint',actor:{userId:uid},amountUsdCents:'350'}]});
    expect(walletActivity(records).timeline.at(-1)).toMatchObject({addresses:2,transfers:1,volume:120n});
    expect(walletActivity(records)).toMatchObject({addresses:2,mints:1,claims:0,volume:'120',pricedTransfers:1});
  });
  it('joins graph and action evidence per transfer and copy, and separates value from payment',()=>{
    const base=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'a',actionKind:'receiz.sports_arena.card_transfer',createdAt:'2026-05-31T12:00:00Z'}]}).records[0];
    const transfer:PublicRecord={...base,pulse:'12000000',evidence:{transferId:'move',claimHash:'a'.repeat(64)},valueOperands:{cardValueUsdCents:'2500',considerationUsdCents:'0'}};
    const graph:PublicRecord={...transfer,id:'graph:b',source:'graph',kind:'card-transfer',valueOperands:{considerationUsdCents:'0'}};
    const second:PublicRecord={...transfer,id:'actions:c',evidence:{...transfer.evidence,claimHash:'b'.repeat(64)},valueOperands:{}};
    const rows=[transfer,graph,second,{...transfer,id:'other',kind:'signal_run.card.transfer_download'}];
    expect(collectibleActivity(rows)).toMatchObject({total:2,volume:2500n,priced:1,paid:0n,paymentCoverage:1});
    expect(collectibleActivity(rows).timeline.at(-1)?.count).toBe(2);
    expect(walletActivity(rows).transfers).toHaveLength(0);
  });
  it('shows the recorded payment metric only when the held transfers carry a nonzero total',()=>{
    const transfer=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'a',actionKind:'receiz.sports_arena.card_transfer',createdAt:'2026-05-31T12:00:00Z'}]}).records[0];
    const render=(considerationUsdCents?:string)=>renderToStaticMarkup(createElement(CollectibleActivity,{records:[
      {...transfer,pulse:'12000000',valueOperands:{cardValueUsdCents:'17302983033',considerationUsdCents}},
    ]}));
    for(const payment of [undefined,'0']){
      const markup=render(payment);
      expect(markup).not.toContain('Recorded payments');
      expect(markup).toContain('$173,029,830.33');
    }
    const paid=render('1');
    expect(paid).toContain('<h3>Recorded payments</h3><strong>$0.01</strong>');
    expect(paid).toContain('aria-label="Recorded payments from');
  });
  it('includes recorded zeroes in transaction sizes and excludes movements without amounts',()=>{
    const transfers=(amounts:(string|null)[])=>walletActivity(parsePublicNetworkPage('wallet',{ok:true,rows:
      amounts.map((amountUsdCents,i)=>({id:'transfer-'+i,kind:'transfer',amountUsdCents})),
    }).records);
    expect(transfers([null]).sizes).toBeNull();
    expect(transfers(['0',null]).sizes).toEqual({average:0n,median:0n,p90:0n,largest:0n});
    const amounts=['0','1','2','3','4','5','6','7','8','10000000000000000001',null];
    expect(transfers(amounts)).toMatchObject({pricedTransfers:10,sizes:{average:1000000000000000004n,median:5n,p90:8n,largest:10000000000000000001n}});
  });
  it('counts both rails once and retains mixed, single-rail and unclassified gross amounts',()=>{
    const rows=[
      {id:'mixed',kind:'chat_transfer',amountUsdCents:'10000',valueReceipt:{settledUsdCents:'150',phiUsdCents:'9850'}},
      {id:'settlement',kind:'transfer',amountUsdCents:'40000',valueReceipt:{settledUsdCents:'0',phiUsdCents:'40000'}},
      {id:'reserve',kind:'chat_transfer',amountUsdCents:'500',valueReceipt:{settledUsdCents:'500',phiUsdCents:'0'}},
      {id:'unknown',kind:'chat_transfer',amountUsdCents:'300'},
      {id:'execution',actionKind:'wallet.transfer.connect',amountUsdCents:'10000'},
    ];
    const {records}=parsePublicNetworkPage('wallet',{ok:true,rows});
    expect(walletActivity(records)).toMatchObject({volume:'50800',pricedTransfers:4,sizes:{average:12700n,median:5250n,p90:40000n,largest:40000n}});
  });
});
