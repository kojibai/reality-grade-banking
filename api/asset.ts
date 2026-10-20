import {handleAssetPreview} from '../server/asset-runtime/asset-preview.mjs';
// Public retained-source presentation. Never opens identity or financial APIs.
export default {fetch(request:Request):Promise<Response>{return handleAssetPreview(request);}};
