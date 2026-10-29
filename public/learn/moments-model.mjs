// Illustrative accepted funds at a fixed reference; not a valuation or issuance reader.
export const momentPayments=Object.freeze([
 Object.freeze({from:0,to:1,cents:3000,label:'Repairs paid. Work can continue.',detail:'$30 · Farmer → Mechanic',flow:'repair'}),
 Object.freeze({from:1,to:0,cents:2000,label:'A repair becomes food on the table.',detail:'$20 · Mechanic → Farmer',flow:'food'}),
 Object.freeze({from:2,to:3,cents:4000,label:'A performance helps pay for a home.',detail:'$40 · Musician → Builder',flow:'home'}),
 Object.freeze({from:3,to:0,cents:1500,label:'The builder buys what the farmer grows.',detail:'$15 · Builder → Farmer',flow:'onward'})
]);
export const momentFrames=Object.freeze([
 Object.freeze({phase:0,count:0,title:'Four people. Four originals.',detail:'Each person seals their own eligible moment.',fundsVisible:false}),
 Object.freeze({phase:0,count:0,title:'Your proof. Your signature. Your funds.',detail:'Own PBI signature · Accepted source & ownership · Applicable monetary rules',fundsVisible:true}),
 ...momentPayments.map((payment,i)=>Object.freeze({phase:1,count:i+1,title:payment.label,detail:payment.detail,flow:payment.flow,fundsVisible:true})),
 Object.freeze({phase:2,count:4,title:'Different choices. Different amounts held.',detail:'Earned. Spent. Retained. The same personal origination rights.',fundsVisible:true}),
 Object.freeze({phase:3,count:4,title:'Everyone can begin. We still need one another.',detail:'Your moments are yours. What you do with them is up to you.',fundsVisible:true})
]);
export function momentFrame(index){const at=Number.isFinite(index)?Math.max(0,Math.min(momentFrames.length-1,Math.trunc(index))):0,frame=momentFrames[at],balances=[12000,12000,12000,12000];for(const payment of momentPayments.slice(0,frame.count)){balances[payment.from]-=payment.cents;balances[payment.to]+=payment.cents;}return{...frame,index:at,basis:'fixed-usd-reference',balances};}
export const momentAmount=cents=>'$'+(cents/100).toLocaleString('en-US',{maximumFractionDigits:0});

// Separate, fixed illustration of the existing source and receiving laws.
// These numbers are explanatory: no proof is admitted and no value is issued.
const causalSourceIdentity='illustrative-original-a';
const causalState=(title,detail,values={})=>Object.freeze({title,detail,sourceIdentity:causalSourceIdentity,basis:'fixed-illustrative-phi',sourceCount:0,files:1,calculated:0,admitted:false,used:0,remaining:0,payments:0,...values,balances:Object.freeze(values.balances??[0,0,0])});
export const causalFrames=Object.freeze([
 causalState('Begin with your source.','A captured moment. No sealed origin or accepted funds.'),
 causalState('One seal. One Kai origin.','The Original binds the source and its own origin. That origin stays fixed.',{sourceCount:1}),
 causalState('Calculate the value.','At this fixed illustrative coordinate: 100 Φ calculated. Not yet spendable.',{sourceCount:1,calculated:100}),
 causalState('Your signature unlocks its use.','Assume this Original’s own PBI, public proof, current ownership and monetary admission are accepted.',{sourceCount:1,calculated:100,admitted:true,remaining:100,balances:[100,0,0]}),
 causalState('Duplicate claim rejected.','Presenting this source again cannot create another Original or unlock extra funds.',{sourceCount:1,files:2,calculated:100,admitted:true,remaining:100,balances:[100,0,0]}),
 causalState('Send 30 Φ. Keep 70 Φ.','The accepted payment records 30 Φ used from this source and 30 Φ received.',{sourceCount:1,files:2,calculated:100,admitted:true,used:30,remaining:70,payments:1,balances:[70,30,0]}),
 causalState('Second spend rejected.','The Original’s accepted history records the 30 Φ already used. The same funds cannot be spent again.',{sourceCount:1,files:2,calculated:100,admitted:true,used:30,remaining:70,payments:1,balances:[70,30,0]}),
 causalState('The next person sends 10 Φ onward.','The next accepted payment leaves 70 / 20 / 10 Φ. The owner’s source still records 30 Φ used.',{sourceCount:1,files:2,calculated:100,admitted:true,used:30,remaining:70,payments:2,balances:[70,20,10]})
]);
export function causalFrame(index){const at=Number.isFinite(index)?Math.max(0,Math.min(causalFrames.length-1,Math.trunc(index))):0;return{...causalFrames[at],index:at,balances:[...causalFrames[at].balances]};}
