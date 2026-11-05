import {openConnectedNoteDelivery} from '../../src/receiz/note-delivery';
import {isBankConnectedNoteImage,readBankConnectedNoteImage} from '../../native/receiz/app/lib/wallet/bankNotes/connectedNoteImage';
import {isBankConnectedNoteSource,readBankConnectedNoteSource} from '../../native/receiz/app/lib/wallet/bankNotes/connectedNote';
import type {ConnectedNoteModule} from '../../src/receiz/connected-note-application';
import {fixtureRoots} from './fixed-fixture-sdk';
const samples=new Map([
 ['a5cf09bdfc8e4c503a7d23e480b52020557ff9ba6de2cb943ff6e279e525fb78','authentic'],
 ['20f41e011e77f040983598d4a1fc28b52a551836bab3e711999d97aa0b7f0864','wrong-delivery-authority'],
]);
const native={isBankConnectedNoteImage,isBankConnectedNoteSource,
 readBankConnectedNoteImage:(bytes:Uint8Array)=>readBankConnectedNoteImage(bytes,{roots:fixtureRoots}),
 readBankConnectedNoteSource:(bytes:Uint8Array)=>readBankConnectedNoteSource(bytes,{roots:fixtureRoots}),
}as ConnectedNoteModule;
/** Fixed synthetic evidence only. No caller-selected roots, identity, custody
 * handle, current spendability or account-credit authority is issued. */
export async function verifySyntheticDemoFixture(bytes:Uint8Array){
 if(!(bytes instanceof Uint8Array)||bytes.length>32768)throw Error('SYNTHETIC_DEMO_FIXTURE_REQUIRED');
 const held=bytes.slice(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',held))).map(value=>value.toString(16).padStart(2,'0')).join(''),fixture=samples.get(digest);
 if(!fixture)throw Error('SYNTHETIC_DEMO_FIXTURE_REQUIRED');
 try{
  const opened=await openConnectedNoteDelivery({native,bytes:held});
  return Object.freeze({fixture,synthetic:true,verified:true,amountUsdCents:opened.source.amountUsdCents,carriedSourceVerified:true,deliveryAuthorityBound:!!opened.noteIdentity,currentSpendabilityChecked:false,creditAuthorized:false});
 }catch(cause){
  return Object.freeze({fixture,synthetic:true,verified:false,error:cause instanceof Error?cause.message:'SYNTHETIC_DEMO_VERIFICATION_FAILED',currentSpendabilityChecked:false,creditAuthorized:false});
 }
}
