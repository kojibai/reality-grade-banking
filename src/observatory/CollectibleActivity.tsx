import {useMemo} from 'react';
import {formatMoney} from '../core/money';
import type {PublicRecord} from '../receiz/public-network';
import {AudienceSpark} from './AudienceHistory';
import {collectibleActivity} from './collectible-transfers';

const number=new Intl.NumberFormat('en-US');
export function CollectibleActivity({records}:{records:readonly PublicRecord[]}){
  const data=useMemo(()=>collectibleActivity(records),[records]);
  const stats=[
    {title:'Collectible transfers',value:number.format(data.total),caption:'Distinct card transfers across the public ledgers',series:data.timeline.map(p=>({at:p.at,value:p.count}))},
    {title:'Collectible transfer volume',value:data.priced?formatMoney(String(data.volume)):'—',caption:'Card values at transfer · '+number.format(data.priced)+' of '+number.format(data.total)+' transfers valued',series:data.timeline.filter(p=>p.priced>0).map(p=>({at:p.at,value:Number(p.volume)/100}))},
  ];
  if(data.paid!==0n){
    stats.push({title:'Recorded payments',value:formatMoney(String(data.paid)),caption:'Amount paid for the cards · '+number.format(data.paymentCoverage)+' transfers reporting payment',series:data.timeline.filter(p=>p.paymentCoverage>0).map(p=>({at:p.at,value:Number(p.paid)/100}))});
  }
  return <section id="obs-collectibles"><div className="obs-section-head"><h2>Collectible activity</h2></div>
    <div className="obs-audience-grid obs-collectible-grid">{stats.map(stat=><div key={stat.title}><h3>{stat.title}</h3><strong>{stat.value}</strong><small>{stat.caption}</small><AudienceSpark points={stat.series} label={stat.title}/></div>)}</div></section>;
}
