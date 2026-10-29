import {bankMeetingPath,meetingCoordinate} from './meeting-links';
import type {FixedSale} from './fixed-checkout';
/** Navigation only. Native Calendar/Wallet admission independently checks paid
 * entry; remembered coordinates cannot grant meeting or payment authority. */
export function rememberMeetingPaymentReturn(sale:FixedSale,path:string){
 if(meetingCoordinate(path)?.eventId!==sale.saleId||!bankMeetingPath('https://bankeiz.com'+path))throw Error('MEETING_PAYMENT_MISMATCH');
 try{sessionStorage.setItem('bankeiz:meeting-payment:'+sale.digest,path);}catch{/* Reopening the invitation remains available. */}
}
export function meetingPaymentReturn(sale:FixedSale|undefined){
 if(!sale)return null;try{const path=sessionStorage.getItem('bankeiz:meeting-payment:'+sale.digest);return path&&meetingCoordinate(path)?.eventId===sale.saleId&&bankMeetingPath('https://bankeiz.com'+path)?path:null;}catch{return null;}
}
