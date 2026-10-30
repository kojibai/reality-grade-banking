/** The existing bounded media positions survive Feed views in this document. */
export const feedMediaPositions:Record<string,number>={};
export function saveFeedMediaPosition(id:string,time:number){feedMediaPositions[id]=time;const keys=Object.keys(feedMediaPositions);if(keys.length>48)delete feedMediaPositions[keys[0]];}
