// Public, deterministic teaching data. These labels are not sealed Receiz
// sources, SDK custody, financial authority, hashes or live account records.
export const formatMoney=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents/100);
export const economyPeople=Object.freeze([
 {id:'restaurant',name:'Restaurant',app:'Restaurant till'},
 {id:'supplier',name:'Produce supplier',app:'Supplier workspace'},
 {id:'wholesaler',name:'Wholesaler',app:'Independent wallet'},
 {id:'distributor',name:'Distributor',app:'Business payments'},
 {id:'contractor',name:'Contractor',app:'Contractor account'},
 {id:'merchant',name:'Next merchant',app:'Merchant receiver'},
]);
const economyAmounts=Object.freeze([6000,4000,2500,1500,1000]);
const chainPeople=Object.freeze(['restaurant','supplier','distributor','contractor']);
function stateAt(people,amounts,initial,step){
 if(!Number.isInteger(step)||step<0||step>amounts.length)throw Error('DEMONSTRATION_STEP_INVALID');
 const balances=Object.fromEntries(people.map((id,i)=>[id,i===0?initial:0]));
 const transitions=[];
 for(let i=0;i<step;i++){
  const amountCents=amounts[i],sender=people[i],recipient=people[i+1];
  if(balances[sender]<amountCents)throw Error('DEMONSTRATION_INSUFFICIENT_VALUE');
  balances[sender]-=amountCents;balances[recipient]+=amountCents;
  transitions.push({id:`demo-transfer-${i+1}`,predecessor:i===0?'demo-admission':`demo-transfer-${i}`,sender,recipient,amountCents,acceptedInDemonstration:true});
 }
 return {initialCents:initial,step,balances,transitions};
}
export const economyState=step=>stateAt(economyPeople.map(p=>p.id),economyAmounts,10000,step);
export const chainState=step=>stateAt(chainPeople,[18000,12000,7000],25000,step);
export const comparisonSteps=Object.freeze([
 {title:'Customer pays',provider:'A supported payment method starts a $250 payment.',native:'A legitimate $250 proof-native payment is initiated.',difference:'Same commercial purpose. Different receiving architecture.',providerState:'Payment initiated',nativeState:'Original offered'},
 {title:'Receive and verify',provider:'The provider processes the transaction through its supported infrastructure.',native:'The receiver opens the exact Original, verifies its source, authority and applicable receiving conditions.',difference:'The receiver can inspect the evidence itself.',providerState:'Provider processing',nativeState:'Source + authority checked'},
 {title:'Merchant receives',provider:'The merchant receives a payment result under the service’s settlement arrangement.',native:'The accepted financial transition establishes the merchant’s ownership and available value.',difference:'Authenticity alone is not acceptance. The ownership transition must commit.',providerState:'Payment confirmed',nativeState:'Transition accepted'},
 {title:'Pay the supplier',provider:'The merchant starts another payment using the rails, balances and settlement arrangements available to it.',native:'The merchant transfers $180 onward. The supplier independently verifies and accepts it in a different conforming implementation.',difference:'The evidence continues with the value, without returning to the original provider for authorization.',providerState:'Next payment through a rail',nativeState:'Supplier receives $180'},
]);
export const evidenceLayers=Object.freeze([
 {key:'source',title:'Source',description:'The exact enclosing Original, its admitted value source and canonical trust bindings.',binding:'sourceProofObjectId · sourceValueHead · pinned roots',contract:'digital-payments.md'},
 {key:'identity',title:'Identity & authority',description:'The receiving subject and application are bound to the operation. Signing consent belongs to the authorized participant.',binding:'applicationId · destinationSubjectId · participantId',contract:'receiving-standard.md'},
 {key:'ownership',title:'Ownership',description:'Current source and destination heads must match the actual participants. An account login or a plan alone does not transfer ownership.',binding:'expectedParticipantHeads · expectedDestinationHead',contract:'digital-payments.md'},
 {key:'time',title:'Temporal authority',description:'KaiSigil-bound KKS evidence establishes legitimate causal ordering. A local timestamp is a display, not temporal authority.',binding:'Verified KaiSigil-bound KKS coordinates',contract:'receiving-standard.md'},
 {key:'funding',title:'Funding composition',description:'Reserve preserves its original funded dollar denomination. Settlement preserves its exact native Phi amount. Mixed Notes carry every funding part.',binding:'Explicit rail · amountPhiMicro · Note fundingParts',contract:'../docs/settlement-note-contract.md'},
 {key:'continuity',title:'Continuity',description:'The exact predecessor, committed participant transitions and canonical recovery are retained for the next authorized operation.',binding:'transitionSet · committedTransitions · canonical recovery',contract:'holding-and-recovery.md'},
 {key:'verification',title:'Verification',description:'Check authenticity, current authority and the accepted transition separately. An inspection report cannot mint spend authority.',binding:'verifyTransitionSet → qualified commit → receiveReserve / receiveSettlement',contract:'receiving-standard.md'},
]);
export const emailSteps=Object.freeze([
 {title:'Send',caption:'An email delivers the invitation. It is not an ownership credential.'},
 {title:'Invitation',caption:'The invitation identifies the sender and the payment already recorded for the recipient account.'},
 {title:'Receive',caption:'The legitimate recipient establishes or restores their Identity Record. The verified handoff opens the matching funded account.'},
 {title:'Use the value',caption:'The same recorded value is available under that account’s supported financial contract; opening the invitation does not credit it twice.'},
]);
