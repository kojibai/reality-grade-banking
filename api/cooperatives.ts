import {handleCooperativeConversation} from '../server/cooperative-conversation.mjs';
// Public visitor conversation and existing booking path; no private owner credential.
export default {fetch(request:Request):Promise<Response>{return handleCooperativeConversation(request);}};
