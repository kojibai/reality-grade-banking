import {handlePreparedPublicMarket} from '../server/prepared-public-market.js';
export default {fetch(request:Request):Promise<Response>{return handlePreparedPublicMarket(request);}};
