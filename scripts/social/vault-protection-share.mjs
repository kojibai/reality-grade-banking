import {protectionArt} from '../vault-protection-art.mjs';
import {bankMarkPaths} from '../../branding/bank-mark.mjs';
export function protectionShareCard(){
 const art=protectionArt('share').replace('class="vp-art"','x="855" y="60" width="850" height="700"');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="909" viewBox="0 0 1730 909"><rect width="1730" height="909" fill="#fbfcfe"/><svg x="90" y="70" width="70" height="70" viewBox="112 112 288 288" fill="#172b45">${bankMarkPaths}</svg><g font-family="Inter SemiBold" font-weight="600" font-size="99" letter-spacing="-4"><text x="90" y="335" fill="#172b45">Prove it’s yours.</text><text x="90" y="448" fill="#315be3">Keep it yours.</text></g><g font-family="Inter" font-size="27" fill="#60718a"><text x="95" y="533">Share proof without sharing access.</text><text x="95" y="578">Keep your Vault authority separate.</text></g>${art}<g font-family="Inter" font-size="22" fill="#60718a"><text x="95" y="803">REALITY-GRADE BANKING</text><text x="1510" y="803">Bankeiz</text></g><style>.vp-copy-file,.vp-proof-change{display:none}</style></svg>`;
}
