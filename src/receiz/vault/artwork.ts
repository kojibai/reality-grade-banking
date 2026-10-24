import {paymentQr,paymentQrPath} from '../payment-qr';
import {vaultObject} from './encoding';

export type VaultArtwork={vaultId:string;name:string;ownerReceizId:string;sourceDigest:string;kaiUPulse:string;kind:'private'|'public';publicUrl:string;holdings:number;protection?:'image'|'passkey'};
const identifier=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const digest=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function vaultPublicUrl(vaultId:string,proofDigest?:string):string{
 if(!identifier(vaultId)||proofDigest!==undefined&&!digest(proofDigest))throw Error('VAULT_LOCATOR_INVALID');
 return `https://bankeiz.com/vault/${vaultId}/${proofDigest?'?proof='+proofDigest:''}`;
}
/** Artwork is presentation only. The public QR contains an exact view-only
 * locator. Private recovery is carried separately inside the encrypted image. */
export function drawVaultArtwork(input:VaultArtwork):string{
 const v=vaultObject(input,['vaultId','name','ownerReceizId','sourceDigest','kaiUPulse','kind','publicUrl','holdings',...(Object.hasOwn(input,'protection')?['protection']:[])]);
 if(v.protection!==undefined&&(v.kind!=='private'||!['image','passkey'].includes(String(v.protection))))throw Error('VAULT_ARTWORK_INVALID');
 if(!identifier(v.vaultId)||!digest(v.sourceDigest)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||/[\u0000-\u001f\u007f]/.test(v.name)||typeof v.ownerReceizId!=='string'||!/^[-A-Za-z0-9_.@]{1,180}$/.test(v.ownerReceizId)||typeof v.kaiUPulse!=='string'||!/^\d{1,30}$/.test(v.kaiUPulse)||!['private','public'].includes(String(v.kind))||!Number.isSafeInteger(v.holdings)||Number(v.holdings)<0||Number(v.holdings)>4096||v.publicUrl!==vaultPublicUrl(v.vaultId,v.kind==='public'?v.sourceDigest:undefined))throw Error('VAULT_ARTWORK_INVALID');
 const privateOriginal=v.kind==='private',protectedOriginal=privateOriginal&&v.protection==='passkey',title=privateOriginal?'Private vault':'Proof of holdings',name=escape(v.name),owner=escape(v.ownerReceizId);
 const ellipses=Array.from({length:24},(_,i)=>`<ellipse cx="625" cy="535" rx="${235+i*5}" ry="${96+i*3}" transform="rotate(${i*7.5} 625 535)"/>`).join('');
 const qr=paymentQrPath(paymentQr(v.publicUrl as string));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="vault-title vault-description">
<title id="vault-title">${title} · ${name}</title><desc id="vault-description">${privateOriginal?(protectedOriginal?'Encrypted private original. Your passkey is required.':'Private bearer original. Keep this original private.'):'Shared ownership evidence. View only. The record applies at its sealed coordinate.'}</desc>
<defs><linearGradient id="water" x2="1" y2="1"><stop stop-color="#f8fbfd"/><stop offset=".52" stop-color="#e5f3f1"/><stop offset="1" stop-color="#eff1fa"/></linearGradient><radialGradient id="air"><stop stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><clipPath id="name"><rect x="116" y="238" width="1250" height="104"/></clipPath></defs>
<rect width="1600" height="1000" fill="#f9fbfc"/><rect x="32" y="32" width="1536" height="936" rx="34" fill="url(#water)" stroke="#c2d4df"/><rect x="51" y="51" width="1498" height="898" rx="25" fill="none" stroke="#fff"/>
<ellipse cx="600" cy="520" rx="760" ry="500" fill="url(#air)"/><g fill="none" stroke="#427d88" stroke-width=".65" opacity=".11">${ellipses}</g>
<path d="M116 143h54m-27-27v54" stroke="#507687" stroke-width="1.2"/><circle cx="143" cy="143" r="23" fill="none" stroke="#507687" stroke-width=".8"/>
<g fill="#183249" font-family="Arial,Helvetica,sans-serif"><text x="198" y="151" font-size="19" letter-spacing="4">${title.toUpperCase()}</text><text x="1480" y="151" text-anchor="end" fill="#5b798b" font-size="16" letter-spacing="2">${privateOriginal?'PROTECTED ORIGINAL':'OWNERSHIP RECORD'}</text>
<g clip-path="url(#name)"><text x="116" y="313" font-family="Georgia,serif" font-size="${v.name.length>36?48:70}" letter-spacing="-1.4">${name}</text></g>
<text x="116" y="382" font-size="17" letter-spacing="2.4" fill="#647f8d">OWNER · RECEIZ ID</text><text x="116" y="427" font-family="monospace" font-size="${v.ownerReceizId.length>50?18:27}">${owner}</text>
<text x="116" y="698" font-size="20">${privateOriginal?(protectedOriginal?'Your passkey is required':'Keep this original private'):'View only'}</text><text x="116" y="733" font-size="17" fill="#607989">${privateOriginal?(protectedOriginal?'Open this original with your saved protection.':'This private original gives access to this vault.'):'Original evidence carried within. Independently verifiable.'}</text>
<path d="M116 777h1364" stroke="#b3cbd6" stroke-width="1"/>
<text x="116" y="821" font-size="13" letter-spacing="2" fill="#647f8d">${privateOriginal?'ORIGINAL':'DISCLOSED RECORD'} · SHA-256</text><text x="116" y="855" font-family="monospace" font-size="18">${v.sourceDigest}</text><text x="116" y="903" font-size="16" fill="#607989">KAI μPULSE ${v.kaiUPulse} · ${v.holdings} ${Number(v.holdings)===1?'holding':'holdings'}</text>
<text x="1327" y="708" text-anchor="middle" font-size="14" fill="#607989">${privateOriginal?'Public view':'Open shared record'}</text></g>
<rect x="1168" y="362" width="318" height="318" rx="15" fill="#fff" stroke="#cad9e2"/><svg x="1180" y="374" width="294" height="294" viewBox="0 0 61 61" shape-rendering="crispEdges"><rect width="61" height="61" fill="#fff"/><path fill="#183249" d="${qr}"/></svg>
</svg>`;
}
