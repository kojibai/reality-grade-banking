import type {GovernanceTerms} from './governance-documents';
export const governanceSections={charter:'charters',ratification:'ratifications',proposal:'proposals',ballot:'ballots',mandate:'mandates',challenge:'challenges',candidacy:'candidates',closure:'closures',registration:'registrations'} as const;
const digest=/^[a-f0-9]{64}$/;
export function governancePath(kind:GovernanceTerms['kind'],id:string){
  if(!digest.test(id))throw Error('Invalid governance Original digest.');
  return '/vote/'+governanceSections[kind]+'/'+id+'/';
}
export function governanceLocation(url:URL):string|null{
  const match=/^\/vote\/(charters|proposals|ballots|mandates|challenges|ratifications|candidates|closures|registrations)\/([a-f0-9]{64})\/?$/.exec(url.pathname);
  if(match)return match[2];
  const key=url.searchParams.get('original');
  return /^\/vote\/?$/.test(url.pathname)&&key&&digest.test(key)?key:null;
}
