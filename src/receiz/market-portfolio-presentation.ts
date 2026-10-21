import type {MarketPortfolio} from './market-portfolio';
/** Private presentation for the currently open account only. Never persisted
 * publicly, exported with a page, or used to grant access or submit a trade. */
let current:{owner:string;portfolio:MarketPortfolio}|null=null;const listeners=new Set<()=>void>();
export const readOpenPortfolio=()=>current;
export const subscribeOpenPortfolio=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function publishOpenPortfolio(owner:string,portfolio:MarketPortfolio|null){if(portfolio)current={owner,portfolio};else if(current?.owner===owner)current=null;else return;for(const listener of listeners)listener();}
