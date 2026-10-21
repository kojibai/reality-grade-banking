import {formatUnits} from '../../core/money';

export function BuyAmountPresets({value,onChange,disabled=false}:{value:string;onChange(value:string):void;disabled?:boolean}){
 return <div className="quick-amounts trade-amount-presets" role="group" aria-label="Purchase amounts">
  {['100','250','500','1000'].map(amount=><button type="button" key={amount} disabled={disabled} aria-pressed={value===amount} onClick={()=>onChange(amount)}>{amount==='1000'?'$1,000':`$${amount}`}</button>)}
 </div>;
}

/** A local input convenience only. The existing Market quote and writer still
 * authorize the exact quantity; no price conversion or new holding read. */
export function SellHoldingPresets({heldMicro,value,onChange}:{heldMicro?:string;value:string;onChange(value:string):void}){
 if(!heldMicro||!/^[1-9]\d{0,39}$/.test(heldMicro))return null;
 const held=BigInt(heldMicro);
 return <div className="quick-amounts trade-amount-presets" role="group" aria-label="Portion of your holdings to sell">
  {[10,25,50,75,100].map(percent=>{const quantity=held*BigInt(percent)/100n,amount=formatUnits(quantity.toString());return <button type="button" key={percent} disabled={quantity===0n} aria-label={`Sell ${percent===100?'all':`${percent}%`} of your holdings`} aria-pressed={value===amount} onClick={()=>onChange(amount)}>{percent===100?'All':`${percent}%`}</button>;})}
 </div>;
}
