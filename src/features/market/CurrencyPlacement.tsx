import { useEffect, useState } from 'react';
import { InlineOpening } from '../../components/InlineOpening';
import { formatUnits } from '../../core/money';
import type { OpenIdentity } from '../../receiz/native-identity';
import { placementSchedule, preparePlacementOffer, type PlacementSchedule } from '../../receiz/native-service-placement';
import { walletPointTime } from '../../receiz/wallet-series';
import { NativeOperation } from '../account/NativeOperation';

const status = {reserved:'Reserved',started:'Live',delivered:'Delivered',cancelled:'Cancelled',expired:'Expired'} as const;
const formatter = new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'});
const moment = (pulse:string) => formatter.format(new Date(walletPointTime(pulse)));
const venueName = (id:string) => id==='bankeiz-discover'?'Discover':id;

export function CurrencyPlacement({identity,assetId,symbol,onRefresh}:{identity:OpenIdentity;assetId:string;symbol:string;onRefresh():void}) {
  const [revision,reload]=useState(0);
  const [schedule,setSchedule]=useState<PlacementSchedule>();
  const [failed,setFailed]=useState(false);
  const [original,setOriginal]=useState('');
  const [slotIndex,setSlot]=useState('');
  const [cancel,setCancel]=useState<string>();
  const [message,setMessage]=useState('');
  useEffect(()=>{
    let open=true;
    void placementSchedule(identity,assetId).then(data=>{if(open){setSchedule(data);setFailed(false);}})
      .catch(()=>{if(open)setFailed(true);});
    return ()=>{open=false;};
  },[identity,assetId,revision]);
  if(failed&&!schedule)return <p role="status">Placement availability is unavailable. <button type="button" className="text-button" onClick={()=>{setFailed(false);reload(value=>value+1);}}>Try again</button></p>;
  if(!schedule)return <InlineOpening label="Checking available placements"/>;
  const selected=slotIndex===''?undefined:schedule.slots[Number(slotIndex)];
  const selectedOriginal=schedule.originals.find(item=>item.id===original);
  const cancellation=schedule.bookings.find(booking=>booking.id===cancel&&booking.status==='reserved');
  const complete=(result:Readonly<{status:string}>,notice:string)=>{
    if(result.status!=='committed')return;
    setMessage(notice);setSlot('');setCancel(undefined);reload(value=>value+1);
  };
  return <section aria-label="Spotlight placement booking">
    {message&&<p role="status">{message}</p>}
    {schedule.slots.length>0&&schedule.originals.length>0?<>
      <label className="form-field"><span>Original</span><select value={original} onChange={event=>setOriginal(event.currentTarget.value)}>
        <option value="">Choose an Original</option>{schedule.originals.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <label className="form-field"><span>Available placement</span><select value={slotIndex} onChange={event=>setSlot(event.currentTarget.value)}>
        <option value="">Choose a placement</option>{schedule.slots.map((slot,index)=><option key={`${slot.venueId}:${slot.startKaiUPulse}`} value={index}>
          {venueName(slot.venueId)} · {moment(slot.startKaiUPulse)} · {formatUnits(slot.quantityMicro)} {symbol}
        </option>)}
      </select></label>
      {selected&&selectedOriginal&&<NativeOperation identity={identity} inputKey={`${schedule.assetDigest}:${selectedOriginal.id}:${selected.venueId}:${selected.startKaiUPulse}`}
        title="Spotlight placement" confirmLabel="Reserve placement" committedTitle="Placement reserved."
        reviewDetails={<div className="detail-list"><div><span>Original</span><strong>{selectedOriginal.title}</strong></div>
          <div><span>Placement</span><strong>{venueName(selected.venueId)} · {moment(selected.startKaiUPulse)} to {moment(selected.endKaiUPulse)}</strong></div>
          <div><span>Credits reserved</span><strong>{formatUnits(selected.quantityMicro)} {symbol}</strong></div></div>}
        input={()=>preparePlacementOffer(identity,assetId,selectedOriginal.id,selected)} onRefresh={onRefresh}
        onResult={result=>complete(result,'Your placement is reserved.')}>
        <p className="body-copy">{selectedOriginal.title} · {venueName(selected.venueId)} · {moment(selected.startKaiUPulse)} to {moment(selected.endKaiUPulse)}</p>
        <p className="small-copy">{formatUnits(selected.quantityMicro)} {symbol} will be held until the placement starts.</p>
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
