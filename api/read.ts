import {handlePublicReading} from '../server/reading-runtime/public-reading.mjs';
// Separate anonymous presentation entry; ordinary app routes never enter it.
export default {fetch(request:Request):Promise<Response>{return handlePublicReading(request);}};
