import {profileUsernameLabel} from '../../receiz/account-name';
import {Fingerprint} from 'lucide-react';
import type {PublicMarketItem} from '../../receiz/public-market';
import './moment-card.css';
const time=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
/** The same carried front fields as the live player, presented locally. */
export function MomentCard({item,compact=false}:{item:PublicMarketItem;compact?:boolean}){
 const source=item.proofManifestSource;let anchor:string|null=null,code=source?.code??null;
 try{const url=new URL(item.verifyUrl??'','https://receiz.com');anchor=url.searchParams.get('a');code??=url.pathname.split('/')[3]??null;}catch{/* Missing fields stay absent. */}
 const proof=source?.proof.groth16Id,poseidon=source?.proof.poseidon,date=item.sealedAt&&Number.isFinite(Date.parse(item.sealedAt))?time.format(new Date(item.sealedAt))+' UTC':null;
 return <div className={"moment-card"+(compact?" is-compact":"")} aria-label="Sealed moment"><div className="moment-card-ornament" aria-hidden="true"><Fingerprint size={48} strokeWidth={.55}/></div><div className="moment-card-heading"><span>Original moment</span><strong>This Happened</strong></div><blockquote>{item.summary||item.title}</blockquote><div className="moment-card-owner">{item.ownerUsername&&<span>@{profileUsernameLabel(item.ownerUsername)}</span>}{!compact&&date&&<time dateTime={item.sealedAt!}>{date}</time>}</div>{!compact&&(code||anchor||item.pulse||proof||poseidon)&&<dl className="moment-card-coordinates">{code&&<div><dt>Code</dt><dd>{code}</dd></div>}{anchor&&<div><dt>Anchor</dt><dd>{anchor}</dd></div>}{item.pulse&&<div><dt>Pulse</dt><dd>{item.pulse}</dd></div>}{proof&&<div><dt>Groth16</dt><dd>{proof}</dd></div>}{poseidon&&<div className="moment-card-commitment"><dt>Poseidon</dt><dd title={poseidon}>{poseidon}</dd></div>}</dl>}</div>;
}
