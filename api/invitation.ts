import {handleInvitationPreview} from '../server/invitation-runtime/invitation-preview.mjs';

// Public display only; the invitation supplies no payment or account authority.
export default {fetch(request:Request):Promise<Response>{return handleInvitationPreview(request);}};
