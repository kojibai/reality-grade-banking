// Public document aliases only; proof and account routes retain their existing authority.
export const publicRouteAliases=Object.freeze({
 '/learn/protect-your-value/':'/protect/',
 '/learn/vaults/':'/vaults/',
 '/business/for/':'/fit/',
 '/cooperatives/':'/coops/',
});
export function canonicalPublicPath(path){
 const clean=path.replace(/[?#].*$/,'').replace(/index\.html$/,''),normalized=clean==='/'?'/':clean.endsWith('/')?clean:clean+'/';
 return publicRouteAliases[normalized]??normalized;
}
