import {it,expect} from 'vitest';
import {createProfileEditor} from '../src/receiz/profile-edit';
it('accepts only a matching account result before publishing a renamed profile',async()=>{
 let published='';const editor=createProfileEditor({accountUid:'account-1',current:()=>true,update:async()=>({accountUid:'foreign',profilePath:'/alexnew',profile:{profile:{username:'alexnew'}}}),availability:async()=>({available:true}),publish:result=>{published=result.profilePath;}});
 await expect(editor.update({username:'alexnew'})).rejects.toThrow('PROFILE_ACCOUNT_MISMATCH');expect(published).toBe('');
});
it('preserves omitted fields and rejects an unacknowledged new links field',async()=>{
 let received:unknown;const editor=createProfileEditor({accountUid:'account-1',current:()=>true,update:async input=>{received=input;return {accountUid:'account-1',profilePath:'/alexmorgan',profile:{profile:{username:'alexmorgan',bio:'New bio'}}};},availability:async()=>({available:true}),publish:()=>{}});
 await editor.update({bio:'New bio'});expect(received).toEqual({bio:'New bio'});
 await expect(editor.update({links:[{label:'Portfolio',url:'https://example.com/'}]})).rejects.toThrow('PROFILE_UPDATE_UNCONFIRMED');
});
it('refuses unsafe links and closed-account results before publishing',async()=>{
 let current=true,published=false;const editor=createProfileEditor({accountUid:'account-1',current:()=>current,update:async()=>{current=false;return {accountUid:'account-1',profilePath:'/alexmorgan',profile:{profile:{username:'alexmorgan'}}};},availability:async()=>({available:true}),publish:()=>{published=true;}});
 await expect(editor.update({websiteUrl:'javascript:alert(1)'})).rejects.toThrow('PROFILE_LINK_INVALID');
 await expect(editor.update({bio:'Updated'})).rejects.toThrow('PROFILE_ACCOUNT_CLOSED');expect(published).toBe(false);
});
it('publishes acknowledged named links and preserves an explicit clear',async()=>{
 const publish=(value:unknown)=>{results.push(value);},results:unknown[]=[],editor=createProfileEditor({accountUid:'account-1',current:()=>true,update:async input=>({accountUid:'account-1',profilePath:'/alexmorgan',profile:{profile:{userId:'account-1',username:'alexmorgan',...input}}}),availability:async()=>({available:true}),publish});
 await editor.update({links:[{label:'Studio',url:'https://studio.example'}]});await editor.update({links:[]});expect(results).toHaveLength(2);expect((results[1] as {profile:{profile:{links:unknown}}}).profile.profile.links).toEqual([]);
});
it('accepts the canonical relative image reference returned by Receiz for the same saved image',async()=>{
 const path='/api/storage/object?bucket=receiz-profile-media&path=profile%2Faccount-1%2Favatar.png',publish=()=>{published=true;};let published=false;const editor=createProfileEditor({accountUid:'account-1',current:()=>true,update:async()=>({accountUid:'account-1',profilePath:'/alexmorgan',profile:{profile:{userId:'account-1',username:'alexmorgan',avatarUrl:path}}}),availability:async()=>({available:true}),publish});await editor.update({avatarUrl:'https://receiz.com'+path});expect(published).toBe(true);
});
it('accepts Receiz displaying the username after clearing an optional name',async()=>{
 const editor=createProfileEditor({accountUid:'account-1',current:()=>true,update:async()=>({accountUid:'account-1',profilePath:'/alexmorgan',profile:{profile:{userId:'account-1',username:'alexmorgan',displayName:'alexmorgan'}}}),availability:async()=>({available:true}),publish:()=>{}});await expect(editor.update({displayName:null})).resolves.toMatchObject({accountUid:'account-1'});
});
it('checks the immutable account and confirms the returned image before publishing an upload',async()=>{
 let published=false;const editor=createProfileEditor({accountUid:'account-1',current:()=>true,update:async()=>{throw Error();},uploadImage:async()=>({accountUid:'foreign',profilePath:'/alexmorgan',profile:{profile:{userId:'foreign',username:'alexmorgan',avatarUrl:'/avatar.png'}}}),availability:async()=>({available:true}),publish:()=>{published=true;}});await expect(editor.uploadImage!(new File(['image'],'photo.webp',{type:'image/webp'}),'avatar')).rejects.toThrow('PROFILE_ACCOUNT_MISMATCH');expect(published).toBe(false);
});
it('updates minimal private owner presentation without making a public profile projection',async()=>{
 const {ownerProfilePresentation}=await import('../src/receiz/profile-edit');expect(ownerProfilePresentation({accountUid:'account-1',profilePath:'/alexprivate',profile:{profile:{userId:'account-1',username:'alexprivate',isPrivate:true,displayName:'Alex',avatarUrl:'/private-owner-photo.png',email:'private@example.com'}}})).toEqual({userId:'account-1',username:'alexprivate',displayName:'Alex',avatarUrl:'https://receiz.com/private-owner-photo.png'});
});
it('binds the existing photo-upload acknowledgement to its requested field and account',async()=>{
 const {readProfileImageUpdate}=await import('../src/receiz/profile-edit');const result={ok:true,accountUid:'account-1',profilePath:'/alexmorgan',profile:{profile:{userId:'account-1',username:'alexmorgan',avatarUrl:'/new-photo.webp'}},upload:{kind:'avatar',imageUrl:'https://receiz.com/new-photo.webp'}};expect(readProfileImageUpdate(result,'account-1','avatar').accountUid).toBe('account-1');expect(()=>readProfileImageUpdate(result,'account-1','banner')).toThrow('PROFILE_UPDATE_UNCONFIRMED');expect(()=>readProfileImageUpdate(result,'other','avatar')).toThrow('PROFILE_ACCOUNT_MISMATCH');result.profile.profile.avatarUrl='/old-photo.webp';expect(()=>readProfileImageUpdate(result,'account-1','avatar')).toThrow('PROFILE_UPDATE_UNCONFIRMED');
});
it('applies only actual boolean privacy/scheduler choices and confirms their native result',async()=>{
 const inputs:unknown[]=[],editor=createProfileEditor({accountUid:'account-1',current:()=>true,update:async input=>{inputs.push(input);return{accountUid:'account-1',profilePath:'/alexmorgan',profile:{profile:{userId:'account-1',username:'alexmorgan',...input}}};},availability:async()=>({available:true}),publish(){}});
 await editor.update({isPrivate:false,showSchedulerButton:true});expect(inputs).toEqual([{isPrivate:false,showSchedulerButton:true}]);await expect(editor.update({isPrivate:'false'} as never)).rejects.toThrow('PROFILE_FIELD_INVALID');expect(inputs).toHaveLength(1);
});
