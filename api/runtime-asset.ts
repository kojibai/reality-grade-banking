import{handlePublicRuntimeAsset}from'../server/public-runtime-asset.js';
export default{fetch(request:Request):Promise<Response>{return handlePublicRuntimeAsset(request);}};
