// Controlled settings projection only. No Identity, network or booking writes.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AvailabilityForm} from '../../src/features/messages/organizer/BookingSettings';
import {readBookingAvailability} from '../../src/receiz/public-booking';
import '../../src/styles/tokens.css';
import '../../src/features/messages/organizer/organizer.css';
import '../../src/features/booking/booking.css';
const query=new URLSearchParams(location.search),available=query.get('account')!=='free',custom=query.get('custom')==='true';
const config={timezone:'UTC',timezoneMode:'manual',slotMinutes:30,hourStarts:[9,10,13,14],weekdayIndexes:[1,2,3,4,5],daysForward:14};
const source=readBookingAvailability({ok:true,owner:{userId:'controlled-owner',username:'controlled_host',displayName:'Casey Example',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[],savedCustomQuestions:[],slots:[],bookingPrice:{currency:'usd',priceUsdCents:'0',feeUsdCents:'0',policyRevision:'controlled-policy'},bookingSettings:{conversationEnabled:query.get('experience')==='twin',conversationAvailable:available}},'controlled_host');
const state={saved:null as unknown};Object.assign(window,{bookingSettingsFixture:state});
function Example(){const[notice,setNotice]=useState(''),[held,setHeld]=useState(source);return <main style={{maxWidth:440,margin:'0 auto',padding:18}}><p style={{fontSize:10,color:'#8798ae',textAlign:'center'}}>Controlled fixture · no live settings or money</p><div className="bank-organizer"><div className="organizer-scroll"><AvailabilityForm initial={held} username="controlled_host" custom={custom} busy={false} onBack={()=>{}} onError={()=>{}} onSave={(schedule,questions,options)=>{state.saved={schedule,questions,options};setHeld(current=>({...current,savedScheduleConfig:schedule,scheduleConfig:schedule,...(options?.conversationEnabled===undefined?{}:{bookingSettings:{...current.bookingSettings!,conversationEnabled:options.conversationEnabled}}),...(options?.bookingPriceUsdCents===undefined?{}:{bookingPrice:{...current.bookingPrice!,priceUsdCents:options.bookingPriceUsdCents}})}));setNotice('Controlled settings accepted.');}}/>{notice&&<p role="status">{notice}</p>}</div></div></main>;}
createRoot(document.getElementById('root')!).render(<Example/>);
