import {expect,it} from 'vitest';
import {createAssetPublicationFetch} from '../src/receiz/asset-publication-runtime';
it('routes source publication and canonical custody through the current connected account',async()=>{
 const calls:{path:string;init?:RequestInit}[]=[];
 const fetch=createAssetPublicationFetch({applicationId:'rc_bank',username:'owner',assertCurrent:()=>{},request:async(path,init)=>{calls.push({path,init});return Response.json({status:'unmigrated'});}});
 await fetch('/api/profile/showcase/accepted-source?username=owner');
 await fetch('/api/profile/owner/originals?source=inventory&cursor=next');
 await fetch('/api/profile/showcase/publication',{method:'POST',headers:{'x-receiz-local-action-signature':'exact'},body:'exact-body'});
 expect(calls.map(c=>c.path)).toEqual(['/api/connect/profile/showcase/publication?applicationId=rc_bank&username=owner','/api/connect/profile/showcase/publication?applicationId=rc_bank&username=owner&action=inventory&cursor=next','/api/connect/profile/showcase/publication?applicationId=rc_bank']);
 expect(calls[2].init).toMatchObject({body:'exact-body',headers:{'x-receiz-local-action-signature':'exact'}});
 await expect(fetch('/api/profile/foreign/originals')).rejects.toThrow('BANK_ASSET_PUBLICATION_TRANSPORT_INVALID');expect(calls.length).toBe(3);
});
