// Deterministic teaching data only. No SDK proof objects, admitted financial
// sources, signatures, current authority, funding or execution are created.
export {formatMoney} from './accept-money-model.js';
export const independentOwners=Object.freeze([
 Object.freeze({id:'bankeiz',ownerId:'demo-owner-A',name:'Bankeiz',app:'Bankeiz account'}),
 Object.freeze({id:'independent',ownerId:'demo-owner-B',name:'Independent Bank',app:'Your independent bank'}),
 Object.freeze({id:'merchant',ownerId:'demo-owner-C',name:'Merchant Wallet',app:'Merchant receiver'}),
]);
const quote=Object.freeze({fictional:true,usdCentsPerPhi:'10000',purpose:'display-only',live:false,funding:false,redemption:false});
const transfers=Object.freeze([
 Object.freeze({sender:'bankeiz',recipient:'independent',amountPhiMicro:'4000000'}),
 Object.freeze({sender:'independent',recipient:'merchant',amountPhiMicro:'2500000'}),
]);
const headLabels=Object.freeze({bankeiz:'A',independent:'B',merchant:'C'});
const lineage='demo-lineage-original-1',initial=10000000n,scale=1000000n;
const displayCents=phi=>Number(BigInt(phi)*BigInt(quote.usdCentsPerPhi)/scale);

export function independentState(step){
 if(!Number.isInteger(step)||step<0||step>transfers.length)throw Error('DEMONSTRATION_STEP_INVALID');
 const revisions={bankeiz:0,independent:0,merchant:0};
 const head=id=>`demo-head-${headLabels[id]}-${revisions[id]}`;
 const positions=Object.fromEntries(independentOwners.map(owner=>[owner.id,{ownerId:owner.ownerId,phiMicro:owner.id==='bankeiz'?String(initial):'0',usdCents:owner.id==='bankeiz'?displayCents(initial):0,head:head(owner.id),lineage}]));
 const transitions=[];
 for(let i=0;i<step;i++){
  const transfer=transfers[i],sender=positions[transfer.sender],recipient=positions[transfer.recipient],amount=BigInt(transfer.amountPhiMicro);
  const senderPredecessor=sender.head,recipientPredecessor=recipient.head;
  if(BigInt(sender.phiMicro)<amount)throw Error('DEMONSTRATION_INSUFFICIENT_VALUE');
  sender.phiMicro=String(BigInt(sender.phiMicro)-amount);recipient.phiMicro=String(BigInt(recipient.phiMicro)+amount);
  sender.usdCents=displayCents(sender.phiMicro);recipient.usdCents=displayCents(recipient.phiMicro);
  revisions[transfer.sender]++;revisions[transfer.recipient]++;sender.head=head(transfer.sender);recipient.head=head(transfer.recipient);
  transitions.push({id:`demo-transfer-${i+1}`,rail:'SETTLEMENT',lineage,sender:transfer.sender,recipient:transfer.recipient,senderOwnerId:sender.ownerId,recipientOwnerId:recipient.ownerId,amountPhiMicro:transfer.amountPhiMicro,amountCents:displayCents(amount),senderPredecessor,senderSuccessor:sender.head,recipientPredecessor,recipientSuccessor:recipient.head});
 }
 const totalPhiMicro=String(Object.values(positions).reduce((sum,position)=>sum+BigInt(position.phiMicro),0n));
 const balances=Object.fromEntries(independentOwners.map(owner=>[owner.id,positions[owner.id].usdCents]));
 return {step,rail:'SETTLEMENT',demonstration:true,lineage,initialPhiMicro:String(initial),totalPhiMicro,initialCents:displayCents(initial),totalCents:Object.values(balances).reduce((sum,amount)=>sum+amount,0),displayQuote:{...quote},balances,positions,transitions};
}
