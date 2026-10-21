import {handleProfilePreview} from '../server/profile-preview.js';
export default {fetch(request:Request):Promise<Response>{return handleProfilePreview(request);}};
