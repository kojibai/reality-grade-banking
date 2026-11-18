import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {profileUsernameLabel} from '../../receiz/account-name';
import {retainedDiscoveredPublicCatalog,subscribeAssetPublicationAdmissions} from '../../receiz/asset-publication-adoption';
import {receivedPublicProfileHeads,publicDirectoryCardVisible,publicProfilesRevision,subscribePublicProfiles} from '../../receiz/public-profile';
import {readPublicProfileHeads,readPublicProfileHeadRefusals} from '../../receiz/public-profile-header';
import {publicProfileDirectoryUid} from '../../receiz/public-profile-directory-contract';
import type {GovernanceRow} from '../../receiz/governance-directory';

export function defaultMemberName(owner:string){
  const username=/^(receiz_[a-z0-9]{18}|[a-z0-9_]{3,24})\.receiz\.id$/.exec(owner)?.[1];
  return username?'@'+profileUsernameLabel(username):owner;
}

/** A public profile can label a signer only when the admitted Original and its
 * authenticated publisher carry the same account UID. Labels never enter terms. */
export function useGovernanceMemberNames(rows:readonly GovernanceRow[],actor:string|null,handle:string|null,profile?:{uid:string;publicName?:string}){
  const catalog=useSyncExternalStore(subscribeAssetPublicationAdmissions,retainedDiscoveredPublicCatalog,()=>null);
  const revision=useSyncExternalStore(subscribePublicProfiles,publicProfilesRevision,publicProfilesRevision);
  const bindings=useMemo(()=>{
    const result=new Map<string,string|null>();
    for(const row of rows){
      const uid=row.profileUid;
      if(!uid||uid!==row.document.accountUid||!publicProfileDirectoryUid(uid))continue;
      const owner=row.document.author;
      result.set(owner,result.has(owner)&&result.get(owner)!==uid?null:uid);
    }
    return result;
  },[rows]);
  const held=useMemo(()=>{
    const names=new Map<string,string|null>();
    for(const {profile:p} of [...(catalog?.publicProfileHeads??[]),...receivedPublicProfileHeads()]){
      if(typeof p.userId==='string'&&typeof p.username==='string')names.set(p.userId,profileUsernameLabel(p.username,typeof p.receivingUsername==='string'?p.receivingUsername:null));
    }
    if(profile?.publicName)names.set(profile.uid,profile.publicName);
    for(const head of catalog?.publicProfileHeadRefusals??[])names.set(String(head.profile.userId),null);
    return names;
  },[catalog,revision,profile?.uid,profile?.publicName]);
  const missing=[...new Set([...bindings.values()].filter((uid):uid is string=>!!uid&&!held.has(uid)))].sort().join(',');
  const [resolved,setResolved]=useState<{key:string;names:Map<string,string>}|null>(null);
  useEffect(()=>{
    if(!missing)return;
    const pending=new Set(missing.split(',')),names=new Map<string,string>(),controller=new AbortController();
    async function read(){
      while(pending.size){
        // The existing directory takes an exclusive UUID cursor. Seek to the first
        // requested public owner so a ballot never requires scanning unrelated pages.
        const first=pending.values().next().value!;
        const previous=BigInt('0x'+first.replaceAll('-',''))-1n;
        const after=previous<0n?'':previous.toString(16).padStart(32,'0').replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5');
        const response=await fetch('/api/bank/public-profile-directory'+(after?'?after='+after:''),{credentials:'omit',signal:controller.signal});
        if(!response.ok)return;
        const page=await response.json();
        if(page?.schema!=='bank.public-profile-directory.v1'||page.ok!==true||!Array.isArray(page.publicProfileHeads))return;
        const refusals=new Set(readPublicProfileHeadRefusals(page.publicProfileHeads).map(h=>h.profile.userId));
        for(const {profile:p} of readPublicProfileHeads(page.publicProfileHeads)){
          const uid=String(p.userId);
          if(pending.has(uid)&&!refusals.has(uid)&&publicDirectoryCardVisible(String(p.username),uid,catalog))names.set(uid,profileUsernameLabel(String(p.username),typeof p.receivingUsername==='string'?p.receivingUsername:null));
        }
        if(controller.signal.aborted)return;
        setResolved({key:missing,names:new Map(names)});
        if(!publicProfileDirectoryUid(page.nextCursor)||page.nextCursor<=after)return;
        for(const uid of pending)if(uid<=page.nextCursor)pending.delete(uid);
      }
    }
    void read().catch(()=>{});return ()=>controller.abort();
  },[missing,catalog,revision]);
  return (owner:string)=>{
    if(owner===actor&&handle)return '@'+handle;
    const uid=bindings.get(owner);
    const name=uid&&(held.has(uid)?held.get(uid):resolved?.key===missing?resolved.names.get(uid):null);
    return name?'@'+name:defaultMemberName(owner);
  };
}
