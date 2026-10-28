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
