import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {BalanceDetails} from '../../src/features/account/BalanceDetails';
import {parseSharedWallet} from '../../src/receiz/shared-wallet';
import {currentWalletObservation,advanceCurrentWalletObservation} from '../../src/receiz/current-wallet-valuation';
import {formatMoney} from '../../src/core/money';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
const packets=import.meta.glob('./current-balance/*.json',{eager:true,import:'default'}) as Record<string,{ok:true;wallet:{userId:string}}>;
const entries=Object.entries(packets);
function frame(key:string){const packet=packets[key];return currentWalletObservation(parseSharedWallet(packet,packet.wallet.userId))!;}
function Fixture(){const [key,setKey]=useState(entries[0][0]),[current,setCurrent]=useState(()=>frame(key));return <main style={{maxWidth:520,margin:'32px auto',padding:20}}><p className="eyebrow">Read-only source fixture</p><h1>Every amount has a path.</h1><p className="body-copy small-copy">Contract-test proof sources. No account creation, signatures, transfers or API reads.</p><select aria-label="Source fixture" value={key} onChange={event=>{setKey(event.target.value);setCurrent(frame(event.target.value));}}>{entries.map(([name])=><option key={name} value={name}>{name.split('/').pop()}</option>)}</select><button className="text-button" onClick={()=>setCurrent(value=>advanceCurrentWalletObservation(value,(BigInt(value.historyBasis!.endKaiUPulse)+1_000_000n).toString())??value)}>Advance held source by one Kai pulse</button><p className="balance-label">Available balance</p><div className="success-amount navy-text balance-sheet-amount">{formatMoney(current.wallet.totalUsdCents)}</div><BalanceDetails wallet={current.wallet} observation={current}/></main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
