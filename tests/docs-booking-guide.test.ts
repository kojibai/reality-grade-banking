import {expect,it} from 'vitest';
import {docsArticles,articleText} from '../src/content/banking-docs.mjs';
import {guideTasks} from '../src/content/user-guide.mjs';
const article=docsArticles.find(page=>page.slug==='calendar-booking')!;
const text=articleText(article);
const section=(title:string)=>{const value=article.sections.find(row=>row.title===title);expect(value,title).toBeDefined();return articleText({...article,sections:[value!]});};
it('teaches saved owner booking modes and price separately from shared-link overrides',()=>{
 const owner=section('Save your availability and booking choices');
 for(const phrase of ['Calendar','Your booking link','Availability','Booking experience','Twin booking','Calendar only','Appointment price','Price in USD','Free','Save availability'])expect(owner).toContain(phrase);
 expect(owner).toContain('Business');expect(owner).toContain('owner');
 expect(owner).toContain('Paid booking does not require a Twin');
 expect(text).toContain('Regular accounts keep the calendar-first flow');
 const shared=section('Share a normal or custom link');
 for(const phrase of ['Create a custom link','Create link','Preview booking page','schedule and guest questions','cannot change the saved price or Booking experience'])expect(shared).toContain(phrase);
 expect(text).not.toMatch(/choose (?:an? )?(?:appearance|colou?r)|set (?:the )?(?:appearance|colou?r)/i);
});
it('teaches the real owner Twin proposal and later human confirmation before payment review',()=>{
 const twin=section('Book through the host’s Twin');
 for(const phrase of ['Business','enabled booking Twin','Your reply','Send reply','Choose a time','Conversation','later reply Yes','Review payment','Pay','initial question','owner’s actual Twin','accepted review'])expect(twin).toContain(phrase);
 expect(twin).toContain('does not approve or send payment');
 expect(twin).toContain('Retry message');
 expect(twin.indexOf('later reply Yes')).toBeLessThan(twin.indexOf('Review payment'));
});
it('teaches explicit existing-account entry, exact contributions, checkout minimum and separate Pay approval',()=>{
 const payment=section('Review and pay for a priced appointment');
 for(const phrase of ['Continue to payment','Review payment','Resume booking','Your account, on this device','Use existing Identity Record','Save Identity Record','same account','From balance','At checkout','$0.50','$0.30','Pay'])expect(payment).toContain(phrase);
 expect(payment).toContain('only after');expect(payment).toContain('email does not select');
 expect(payment).toContain('stays in your balance');
 expect(payment).toContain('minimum payment at checkout');
 expect(payment).toContain('available payment method');
 expect(payment).not.toMatch(/secure card checkout|minimum external card funding|completed card page/i);
 expect(payment).toContain('funding alone does not confirm');
});
it('binds appointment and delivery claims to accepted Wallet Original and Calendar confirmation',()=>{
 const confirmed=section('Inspect the confirmed result and invitation');
 for(const phrase of ['Wallet Original','Calendar','confirmed-paid','You’re booked','Join meeting','Add to calendar','Messages','direct Bankeiz Join meeting','ICS','provider outcome is unknown'])expect(confirmed).toContain(phrase);
 expect(confirmed).toContain('does not guarantee email delivery');
 expect(confirmed).toContain('Pending funding or payment');
 expect(confirmed).toContain('Download proof record');
});
it('retains the same saved payment request, unpaid closure and paid event/payment history',()=>{
 const recovery=section('Continue a saved booking or resolve an interruption');
 for(const phrase of ['Check booking','Retry booking request','same operation','Resume booking','both the Twin and calendar','same account','Cancel this booking','Choose another time','new operation','cancelled-unpaid'])expect(recovery).toContain(phrase);
 const changes=section('Change or cancel the same appointment');
 for(const phrase of ['Edit appointment','Save changes','same event','payment','revision','no second charge','Confirm cancellation','cancelled-paid','automatic refund'])expect(changes).toContain(phrase);
 expect(text).toContain('enabled and qualified');
 expect(text).toContain('does not establish live financial qualification');
});
it('keeps the compact task entrance accurate for free and paid booking',()=>{
 const task=guideTasks.find(task=>task.id==='meet')!;
 for(const phrase of ['Book this time','Continue to payment','Pay','You’re booked'])expect(task.result).toContain(phrase);
 expect(task.evidence).toContain('confirmed');
});
