import {handlePreparedPublicMarket} from '../server/prepared-public-market.js';
import {handlePreparedPublicDocument} from '../server/prepared-public-document.js';
export default {fetch(request:Request):Promise<Response>{
 const url=new URL(request.url);
 return url.searchParams.getAll('entry').length===1&&url.searchParams.get('entry')==='1'&&!url.searchParams.has('prepare')&&!url.searchParams.has('build')?handlePreparedPublicDocument(request):handlePreparedPublicMarket(request);
}};
