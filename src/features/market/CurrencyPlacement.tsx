import { useEffect, useState } from 'react';
import { AmountInput } from '../../components/AmountInput';
import { InlineOpening } from '../../components/InlineOpening';
import { formatUnits, SCALE } from '../../core/money';
import type { OpenIdentity } from '../../receiz/native-identity';
import { formatPlacementDuration, placementPreview, placementSchedule, preparePlacementOffer, type PlacementSchedule, type PlacementSlot } from '../../receiz/native-service-placement';
import { walletPointTime } from '../../receiz/wallet-series';
import { NativeOperation } from '../account/NativeOperation';

const status = {reserved:'Reserved',started:'Live',delivered:'Delivered',cancelled:'Cancelled',expired:'Expired'} as const;
const formatter = new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'});
const moment = (pulse:string) => formatter.format(new Date(walletPointTime(pulse)));
const venueName = (id:string) => id==='bankeiz-discover'?'Discover':id;

const secondFormatter = new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'medium'});
const preciseMoment = (pulse:string) => secondFormatter.format(new Date(walletPointTime(pulse)));

export function CurrencyPlacement({identity,assetId,symbol,onRefresh}:{identity:OpenIdentity;assetId:string;symbol:string;onRefresh():void}) {
  const [revision,reload]=useState(0);
  const [availability,setAvailability]=useState<{
    identity:OpenIdentity;assetId:string;schedule?:PlacementSchedule;failed?:boolean;
  }>();
  const [original,setOriginal]=useState('');
  const [slotIndex,setSlot]=useState('');
  const [amount,setAmount]=useState('');
  const [cancel,setCancel]=useState<string>();
  const [message,setMessage]=useState('');
  useEffect(()=>{
    setOriginal('');setSlot('');setAmount('');setCancel(undefined);setMessage('');
  },[identity,assetId]);
  useEffect(()=>{
    let open=true;
    void placementSchedule(identity,assetId).then(schedule=>{
      if(open)setAvailability({identity,assetId,schedule});
    }).catch(()=>{
      if(open)setAvailability(previous=>({
        identity,assetId,failed:true,
        schedule:previous?.identity===identity&&previous.assetId===assetId?previous.schedule:undefined,
      }));
    });
    return ()=>{open=false;};
  },[identity,assetId,revision]);
  const current=availability?.identity===identity&&availability.assetId===assetId?availability:undefined;
  const schedule=current?.schedule, failed=current?.failed;
  if(failed&&!schedule)return <p role="status">Placement availability is unavailable. <button type="button" className="text-button"
    onClick={()=>{setAvailability(undefined);reload(value=>value+1);}}>Try again</button></p>;
  if(!schedule)return <InlineOpening label="Checking available placements"/>;
  const selected=slotIndex===''?undefined:schedule.slots[Number(slotIndex)];
  const selectedOriginal=schedule.originals.find(item=>item.id===original);
  const rate=selected?.pulsesPerUnit;
  let terms:PlacementSlot|undefined;
  let amountError='';
  if(selected&&(rate===undefined||amount.trim())) {
    try {terms=placementPreview(selected,amount);}
    catch(cause){amountError=cause instanceof Error?cause.message:'Enter a valid spend amount.';}
  }
  const displayMoment=rate===undefined?moment:preciseMoment;
  const duration=terms&&rate!==undefined
    ? formatPlacementDuration(BigInt(terms.endKaiUPulse)-BigInt(terms.startKaiUPulse)) : undefined;
  const cancellation=schedule.bookings.find(booking=>booking.id===cancel&&booking.status==='reserved');
  const complete=(result:Readonly<{status:string}>,notice:string)=>{
    if(result.status!=='committed')return;
    setMessage(notice);setSlot('');setAmount('');setCancel(undefined);reload(value=>value+1);
  };
  return <section aria-label="Placement booking">
    {message&&<p role="status">{message}</p>}
    {failed&&<p role="status">Could not refresh placement availability.</p>}
    {schedule.slots.length>0&&schedule.originals.length>0?<>
      <label className="form-field"><span>Original</span><select value={original} onChange={event=>setOriginal(event.currentTarget.value)}>
        <option value="">Choose an Original</option>{schedule.originals.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <label className="form-field"><span>Available placement</span><select value={slotIndex} onChange={event=>setSlot(event.currentTarget.value)}>
        <option value="">Choose a placement</option>{schedule.slots.map((slot,index)=><option key={`${slot.venueId}:${slot.startKaiUPulse}`} value={index}>
          {venueName(slot.venueId)} · {moment(slot.startKaiUPulse)} · {slot.pulsesPerUnit===undefined?'':'Up to '}{formatUnits(slot.quantityMicro)} {symbol}
        </option>)}
      </select></label>
      {selected&&rate!==undefined&&<>
        <div className="detail-list">
          <div><span>Time per {symbol}</span><strong>{formatPlacementDuration(BigInt(rate)*SCALE)}</strong></div>
          <div><span>Maximum spend for this placement</span><strong>{formatUnits(selected.quantityMicro)} {symbol}</strong></div>
        </div>
        <AmountInput label="Credits to spend" value={amount} onChange={setAmount} suffix={symbol} />
        {amountError&&<p className="small-copy" role="status">{amountError}</p>}
        {duration&&<p className="small-copy" aria-live="polite">Placement duration · {duration}</p>}
      </>}
      {(failed||schedule.slots.some(slot=>slot.pulsesPerUnit!==undefined))&&
        <button type="button" className="text-button" onClick={()=>{setSlot('');reload(value=>value+1);}}>Refresh availability</button>}
      {terms&&selectedOriginal&&<NativeOperation identity={identity}
        inputKey={JSON.stringify([schedule.assetDigest,selectedOriginal.id,terms,revision])}
        title="Placement booking" confirmLabel="Reserve placement" committedTitle="Placement reserved."
        reviewDetails={<div className="detail-list"><div><span>Original</span><strong>{selectedOriginal.title}</strong></div>
          <div><span>Placement</span><strong>{venueName(terms.venueId)} · {displayMoment(terms.startKaiUPulse)} to {displayMoment(terms.endKaiUPulse)}</strong></div>
          {duration&&<div><span>Placement duration</span><strong>{duration}</strong></div>}
          <div><span>Credits reserved</span><strong>{formatUnits(terms.quantityMicro)} {symbol}</strong></div></div>}
        input={()=>preparePlacementOffer(identity,assetId,selectedOriginal.id,terms,schedule.assetDigest)} onRefresh={onRefresh}
        onResult={result=>complete(result,'Your placement is reserved.')}>
        <p className="body-copy">{selectedOriginal.title} · {venueName(terms.venueId)} · {displayMoment(terms.startKaiUPulse)} to {displayMoment(terms.endKaiUPulse)}</p>
        <p className="small-copy">{formatUnits(terms.quantityMicro)} {symbol} will be held until the placement starts.</p>
      </NativeOperation>}
    </>:<p className="body-copy">{schedule.slots.length?'Add a public Original to your Showcase to book a placement.':'There are no available placements right now.'}</p>}
    {schedule.bookings.length>0&&<><h2>Your placements</h2><ul className="detail-list">
      {schedule.bookings.map(booking=><li key={booking.id}>
        <strong>{venueName(booking.venueId)} · {status[booking.status]}</strong> <span>{moment(booking.startKaiUPulse)}</span>
        {booking.status==='reserved'&&<button type="button" className="text-button" onClick={()=>setCancel(booking.id)}>Cancel placement</button>}
      </li>)}
    </ul></>}
    {cancellation&&<NativeOperation identity={identity} inputKey={`${schedule.assetDigest}:${cancellation.id}`} title="Placement cancellation"
      confirmLabel="Cancel and return credits" committedTitle="Placement cancelled."
      reviewDetails={<p className="body-copy">{venueName(cancellation.venueId)} · {moment(cancellation.startKaiUPulse)} · {formatUnits(cancellation.quantityMicro)} {symbol} returned</p>}
      input={()=>({kind:'book-currency-service',assetDigest:schedule.assetDigest,placement:{kind:'cancel-service-placement',bookingId:cancellation.id}})}
      onRefresh={onRefresh} onResult={result=>complete(result,'The reserved credits were returned.')}>
      <p className="body-copy">Cancel the {moment(cancellation.startKaiUPulse)} placement and return {formatUnits(cancellation.quantityMicro)} {symbol}.</p>
    </NativeOperation>}
  </section>;
}
