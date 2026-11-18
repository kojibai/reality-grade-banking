import {handleGovernancePreview} from '../server/governance-runtime/governance-preview.mjs';
export default {fetch(request:Request){return handleGovernancePreview(request);}};
