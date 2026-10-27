import {it,expect} from 'vitest';
import {bankBookingLink,bookingOverrides} from '../src/receiz/booking-link';
it('uses a Bankeiz URL and carries only the existing public scheduling overrides',()=>{
 const scheduleConfig={slotMinutes:30,hourStarts:[9,10],weekdayIndexes:[1,2],daysForward:14};const url=new URL(bankBookingLink('bjklock',{scheduleConfig,customQuestions:[]}));
 expect(url.origin).toBe('https://bankeiz.com');expect(url.pathname).toBe('/book/bjklock/');expect(url.searchParams.get('hourStarts')).toBe('9,10');
 expect(bookingOverrides(new URLSearchParams('fbclid=instagram&privateNote=secret&slotMinutes=30')).toString()).toBe('slotMinutes=30');expect(()=>bookingOverrides(new URLSearchParams('slotMinutes=30&slotMinutes=60'))).toThrow();
});
it('routes both generated and manually typed booking URLs directly to the same built page',async()=>{
 const {readFile}=await import('node:fs/promises'),config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 for(const source of ['/book/:username/','/book/:username'])expect(config.rewrites.find((route:{source:string})=>route.source===source)?.destination).toBe('/book/index.html');
});
