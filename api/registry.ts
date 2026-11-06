import {handleRegistry} from '../server/registry-runtime/registry.mjs';
export default {fetch(request:Request):Promise<Response>{return handleRegistry(request);}};
