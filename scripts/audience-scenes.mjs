// Build-time vector geometry and public copy. No account, image or network work.
export const audienceStages={
 'for-people':[
  ['A shared expense','Dinner is over and everyone owes a share. A receiving request gives each person a clear account to pay.'],
  ['Review your share','Check the recipient and amount, then approve the supported payment with your own identity.'],
  ['Keep the receipt','Open the confirmed result when someone asks. Both people can refer to the same recorded event.'],
 ],
 'for-businesses':[
  ['An amount agreed','A customer has agreed to pay for a repair. Share a receiving request for payment through Receiz.'],
  ['A confirmed payment','Check the actual payment result, with its amount and original operation reference.'],
  ['A record for the books','Keep the receipt alongside the matching entry in the bookkeeping process you already use.'],
 ],
 'for-independent-work':[
  ['The work is done','You and your client have agreed the work and the amount. Keep that context in your conversation.'],
  ['A clear request','Share your receiving destination. The client reviews and approves the supported payment.'],
  ['The job and its receipt','Retain the confirmed payment with your existing job reference, so the next review has the original evidence.'],
 ],
 'for-creators':[
  ['The version you made','Choose the song, image or writing intended for release. Give its claim a clear title and author.'],
  ['The original you publish','Review the source and its defined rights. The admitted publication records the supported result.'],
  ['A work people can inspect','Showcase and Market discovery connect the public object to its original, ownership and available actions.'],
 ],
 'for-communities':[
  ['A shared plan','Members are contributing toward a room booking. The coordinator shares their receiving destination.'],
  ['Individual payment records','Each confirmed contribution has its own receipt. Connect those references to the group’s existing records.'],
  ['An expense you can explain','Approve the agreed payment and keep its receipt with the group’s decision record.'],
 ],
 'for-institutions':[
  ['An unmatched event','Start with the original receipt for the payment under review. Identify its exact participants, amount and moment.'],
  ['A source comparison','Compare the confirmed result and carried funding evidence with your own working records.'],
  ['A review others can repeat','Retain the original sources and event references with the stated scope, so the next reviewer can inspect the same basis.'],
 ],
 'for-public-finance':[
  ['An authorized expense','Keep the expenditure decision and approvals in the organization’s established process.'],
  ['The actual payment','Review the supported account action and retain its confirmed receipt with the expenditure reference.'],
  ['Evidence for review','Share the records authorized for disclosure and keep the originals behind the review. State the included scope.'],
 ],
 'for-platforms':[
  ['An order in your product','Keep the platform’s order reference and resolve the account and scope for the supported operation.'],
  ['An exact authorized action','The user reviews the recipient, amount and intent. Compose the existing Receiz operation.'],
  ['One recoverable result','Retain the original result. A lost reply resumes the same operation before a new action is considered.'],
 ],
};

/** Compose beneath the existing SVG frame, palette and CSS motion controls. */
export function audienceScene(page,{ink,glass,blue,text,line,route,sheet,seal,person,bars}){
 const stage=(index,art)=>`<g data-scene-stage="${index}">${art}</g>`;
 const record=(x,y,width,title,detail,index)=>`${sheet(x,y,width,150,title,detail,index)}${stage(index,bars(x+24,y+90,[width-48,width-74,width-60]))}`;
 const cases={
  'for-people':()=>`
   ${stage(0,`<circle cx="280" cy="73" r="35" fill="${glass}" class="scene-edge"/><circle cx="280" cy="73" r="23" class="scene-line"/><path d="M230 46v29m-7-29v16h14V46m-7 29v26m100-55q-16 14-7 31h7v24" class="scene-line"/>${text(280,23,'A shared dinner',true)}`)}
   ${person(80,172,'You',0)}${person(480,172,'Your friend',0)}
   ${route('M116 172H195')}${route('M365 172H444',-2)}
   ${sheet(200,128,160,112,'Your share','Review payment',1)}
   ${route('M280 248V280',-3)}${sheet(200,285,160,85,'Receipt','Confirmed result',2)}${stage(2,seal(400,328,24))}`,
  'for-businesses':()=>`
   ${stage(0,`<path d="M46 129h130l-16-47H62Z" fill="${glass}" class="scene-edge"/>${[0,1,2,3,4].map(i=>`<path d="M${54+i*24} 105v24" stroke="${i%2?'#b7c9e4':'#486ba6'}" stroke-width="12"/>`).join('')}<path d="M55 140v80h112v-80M91 220v-53h38v53" class="scene-line"/>${text(111,260,'Your customer',true)}`)}
   ${route('M181 163H220')}${sheet(226,115,140,118,'Payment','Amount agreed',1)}
   ${route('M296 244V302H378',-2)}${record(380,232,145,'Your books','Event reference',2)}
   ${stage(2,seal(452,172,28))}${line('M452 202V220')}`,
  'for-independent-work':()=>`
   ${stage(0,`<rect x="40" y="90" width="145" height="105" rx="9" fill="${glass}" class="scene-edge"/><path d="M32 207h162l-16 17H48Z" fill="${glass}" class="scene-edge"/><path d="m83 143 18 18 37-41" class="scene-line scene-accent"/>${text(112,268,'Work completed',true)}`)}
   ${route('M196 144H243')}${sheet(242,98,140,130,'Request','Amount agreed',1)}
   ${route('M315 240C315 295 447 308 447 242',-2)}${record(391,60,145,'Receipt','Job reference',2)}
   ${stage(2,seal(447,310,27))}${text(280,376,'The work and its payment. Connected.',true)}`,
  'for-creators':()=>`
   ${stage(0,`<g class="scene-float"><rect x="43" y="88" width="183" height="206" rx="18" fill="${glass}" class="scene-edge"/><circle cx="135" cy="180" r="62" fill="${ink}"/><circle cx="135" cy="180" r="25" fill="${blue}"/><circle cx="135" cy="180" r="6" fill="#f8fbff"/><path d="M77 257h116" class="scene-line"/></g>${text(135,344,'Your original',true)}`)}
   ${route('M237 168H295')}${stage(1,seal(327,168,32))}${text(327,226,'Publish',true)}
   ${route('M368 168C450 168 405 95 477 95',-2)}
   ${stage(2,`${sheet(398,270,132,83,'Showcase','Public work',2)}<rect x="423" y="50" width="104" height="150" rx="13" fill="${glass}" class="scene-edge"/>${[0,1,2].map(i=>`<path d="M444 ${87+i*30}h62" class="scene-line"/>`).join('')}`)}`,
  'for-communities':()=>`
   ${person(65,82,'Member',0)}${person(65,293,'Member',0)}${person(230,48,'Member',0)}
   ${route('M100 82C175 82 140 199 226 199')}${route('M100 293C175 293 140 199 226 199',-2)}${route('M230 88V126',-4)}
   ${sheet(229,135,151,124,'Payments','Coordinator',1)}
   ${route('M392 199H452',-3)}${stage(2,seal(488,199,30))}${text(480,266,'Room booking',true)}
   ${stage(2,`${line('M304 270V332H477')}${text(280,379,'Keep the expense and its receipt.',true)}`)}`,
  'for-institutions':()=>`
   ${record(35,65,190,'Receipt','Original source',0)}${record(340,65,185,'Review record','Your working entry',1)}
   ${route('M238 166H327')}${line('M238 191H327')}
   ${stage(2,`${line('M131 235V305H433V235')}${seal(282,305,31)}${text(282,370,'Match the event. Retain the evidence.',true)}`)}`,
  'for-public-finance':()=>`
   ${record(35,40,167,'Decision','Agency record',0)}
   ${route('M118 203C118 261 200 250 233 250')}${sheet(237,204,150,118,'Payment','Actual result',1)}
   ${route('M313 190V142H380',-2)}${record(388,48,145,'Receipt','Shared scope',2)}
   ${stage(2,`${line('M388 340H120')}${[120,253,388].map(x=>`<circle cx="${x}" cy="340" r="5" fill="${blue}"/>`).join('')}${text(280,390,'A defined record for public review.',true)}`)}`,
  'for-platforms':()=>`
   ${stage(0,`<rect x="35" y="60" width="165" height="245" rx="20" fill="${glass}" class="scene-edge"/><path d="M35 101h165" class="scene-line"/>${[59,74,89].map(x=>`<circle cx="${x}" cy="81" r="3" fill="${blue}"/>`).join('')}${text(118,149,'Your app')}${bars(60,178,[115,83,98])}${text(118,270,'Order reference',true)}`)}
   ${route('M212 183H246')}${stage(1,`<path d="m304 132 48 27v55l-48 27-48-27v-55Z" fill="${glass}" class="scene-edge"/><path d="m292 169-17 17 17 17m24-34 17 17-17 17" class="scene-line scene-accent"/>${text(304,289,'Exact action',true)}`)}
   ${route('M363 183H387',-2)}${record(395,110,140,'Result','Original proof',2)}
   ${stage(2,`${line('M464 274C464 356 118 356 118 315')}${text(280,394,'Recover the same operation.',true)}`)}`,
 };
 return cases[page.slug];
}
