import {profilePageUsername} from '../receiz/public-profile';
/** Navigation context stays in this tab's history; shared asset URLs stay canonical. */
export function assetReturnDestination(state:unknown,fallback='/explore/'){
 const value=state&&typeof state==='object'?(state as {assetReturnPath?:unknown}).assetReturnPath:null;
 const valid=(path:unknown):path is string=>typeof path==='string'&&path.length<256&&(/^\/#(?:market|assets|ledger|account)$/.test(path)||/^\/explore(?:\/[a-z]+)?\/$/.test(path)||path==='/market-cap/'||!!profilePageUsername(path));
 const path=valid(value)?value:valid(fallback)?fallback:'/explore/',username=profilePageUsername(path);
 return{path,label:path.startsWith('/#')?({market:'Market',assets:'Assets',ledger:'History',account:'Account'}[path.slice(2)]??'Market'):username?'@'+username:path==='/market-cap/'?'Global Market Cap':'Explore'};
}
