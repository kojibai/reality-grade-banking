import {afterEach,expect,it,vi} from 'vitest';
import {openEmailMeeting,readEmailMeetingEntry} from '../src/receiz/email-meeting-entry';
const account=vi.hoisted(()=>({open:vi.fn(),dispose:vi.fn()}));
vi.mock('../src/receiz/pbi-account',()=>({openVerifiedInvitationAccount:account.open}));
const invitation={ok:true,recipient:{userId:'10000000-0000-4000-8000-000000000002',email:'attendee@example.test'},invitation:{eventId:'10000000-0000-4000-8000-000000000004',key:'existing-meeting-key-1234'}};
afterEach(()=>{vi.unstubAllGlobals();vi.resetAllMocks();});
it('opens only the verified existing account once and retains the exact invitation through StrictMode',async()=>{
 const send=vi.fn(async()=>Response.json(invitation));vi.stubGlobal('fetch',send);account.open.mockResolvedValue({dispose:account.dispose});
 const[first,second]=await Promise.all([openEmailMeeting(),openEmailMeeting()]);expect(first).toEqual(invitation);expect(second).toBe(first);expect(send).toHaveBeenCalledExactlyOnceWith('/api/bank/native/email-meeting/open',expect.objectContaining({method:'POST',body:'{}',credentials:'same-origin'}));expect(account.open).toHaveBeenCalledExactlyOnceWith(invitation.recipient.userId);expect(account.dispose).toHaveBeenCalledOnce();
});
it('refuses failed or malformed recipient observations before opening any identity and retries only the staged proof',async()=>{
 const send=vi.fn().mockResolvedValueOnce(Response.json({ok:false},{status:401})).mockResolvedValueOnce(Response.json({...invitation,invitation:{...invitation.invitation,key:'bad'}})).mockResolvedValueOnce(Response.json(invitation));vi.stubGlobal('fetch',send);account.open.mockResolvedValue({dispose:account.dispose});
 await expect(openEmailMeeting()).rejects.toThrow();await expect(openEmailMeeting()).rejects.toThrow();expect(account.open).not.toHaveBeenCalled();expect(await openEmailMeeting()).toEqual(invitation);expect(account.open).toHaveBeenCalledOnce();
});
it('never consumes a scanner stage or creates a fresh account from an absent/expired invitation',async()=>{
 const send=vi.fn().mockResolvedValueOnce(Response.json({ok:true,pending:true,autoContinue:false})).mockResolvedValueOnce(Response.json({ok:true,invitation:false})).mockResolvedValueOnce(Response.json({ok:false},{status:401}));vi.stubGlobal('fetch',send);
 expect(await readEmailMeetingEntry()).toEqual({ok:true,pending:true,autoContinue:false});expect(await readEmailMeetingEntry()).toEqual({ok:true,invitation:false});await expect(readEmailMeetingEntry()).rejects.toThrow();expect(send.mock.calls.every(([url])=>url==='/api/bank/native/email-meeting/state')).toBe(true);expect(account.open).not.toHaveBeenCalled();
});
