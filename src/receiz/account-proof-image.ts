import { exportAccountProof, type VerifiedAccountProof } from './account-proof';
import { accountProofUrl } from './account-proof-links';
import { embedAccountProofPng } from './account-proof-png';
import { paymentQr, paymentQrPath } from './payment-qr';
import { formatMoney, formatUnits } from '../core/money';
import { hasPublicAccountProofLink } from './account-proof-public';
const esc = (v: string) => v.replace(/[&<>"']/gu, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
/** Presentation helper, not proof issuance or verification. */
export function accountProofArtwork(proof: VerifiedAccountProof): string {
  const { account, checkpoint } = proof.statement, url = accountProofUrl(proof.sourceDigest);
  const qr = paymentQrPath(paymentQr(url)), fit = (v: string, max: number) => Math.min(max, Math.floor(1730 / Math.max(1, v.length) * 1.65));
  const reserve = formatMoney(checkpoint.reserveUsdCents), settlement = `${formatUnits(checkpoint.settlementPhiMicro)} Φ`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2160" height="2700" viewBox="0 0 2160 2700"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fcfcfa"/><stop offset="1" stop-color="#f0f3f8"/></linearGradient><pattern id="lines" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M0 36L36 0" stroke="#19334e" stroke-opacity=".025"/></pattern></defs><rect width="2160" height="2700" fill="url(#paper)"/><rect width="2160" height="2700" fill="url(#lines)"/><rect x="56" y="56" width="2048" height="2588" rx="38" fill="none" stroke="#d7dfe9" stroke-width="2"/><g font-family="Arial,Helvetica,sans-serif" fill="#172e44"><text x="180" y="268" font-size="93" font-weight="700" letter-spacing="-5">Bankeiz</text><text x="180" y="339" font-size="25" fill="#7b8798" letter-spacing="5">REALITY-GRADE BANKING</text><path d="M180 438H1980" stroke="#d9e1eb" stroke-width="2"/><text x="180" y="600" font-size="28" fill="#7b8798" letter-spacing="6">PUBLIC ACCOUNT PROOF</text><text x="180" y="748" font-size="112" letter-spacing="-5">Value. Verified.</text><text x="180" y="828" font-size="31" fill="#7b8798">Identity, funds and history at the accepted source head.</text><text x="180" y="1020" font-size="25" fill="#7b8798" letter-spacing="4">RECEIZ ID</text><text x="180" y="1098" font-size="${fit(account.receizId, 49)}" font-weight="600">${esc(account.receizId)}</text><path d="M180 1190H1980" stroke="#d9e1eb" stroke-width="2"/><text x="180" y="1300" font-size="28" fill="#7b8798">Reserve · proof-backed funds</text><text x="180" y="1435" font-size="${fit(reserve, 114)}" font-weight="600" letter-spacing="-3">${esc(reserve)}</text><text x="180" y="1580" font-size="28" fill="#7b8798">Settlement · proof-native value</text><text x="180" y="1690" font-size="${fit(settlement, 87)}" font-weight="600" letter-spacing="-2">${esc(settlement)}</text><path d="M180 1790H1980" stroke="#d9e1eb" stroke-width="2"/><text x="180" y="1902" font-size="28" fill="#7b8798">${checkpoint.transactionCount.toLocaleString('en-US')} transactions · full statement in the original proof</text><text x="180" y="1962" font-size="25" fill="#7b8798">Source Kai uPulse ${esc(checkpoint.kaiUPulse)}</text><text x="180" y="2150" font-size="47" font-weight="600">Inspect the original.</text><text x="180" y="2220" font-size="27" fill="#7b8798">Scan to verify the source, account</text><text x="180" y="2263" font-size="27" fill="#7b8798">and complete disclosed history.</text><text x="180" y="2355" font-size="22" fill="#7b8798">Printed amounts alone are not verification.</text><rect x="1510" y="2042" width="470" height="470" rx="20" fill="#fff"/><svg x="1534" y="2066" width="422" height="422" viewBox="0 0 61 61" shape-rendering="crispEdges"><path d="${qr}" fill="#172e44"/></svg><text x="180" y="2520" font-size="24" fill="#526b87">${esc(url.replace('https://', ''))}</text><text x="180" y="2580" font-size="20" fill="#8b97a8">Original snapshot preserved. Later verified updates are identified on the linked page.</text></g></svg>`;
}
export async function createAccountProofImage(proof: VerifiedAccountProof): Promise<{ bytes: Uint8Array; filename: string }> {
  if (!hasPublicAccountProofLink(proof)) throw Error('ACCOUNT_PROOF_PUBLIC_LINK_REQUIRED');
  const original = await exportAccountProof(proof), svg = accountProofArtwork(proof);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 2160; canvas.height = 2700;
    const context = canvas.getContext('2d'); if (!context) throw Error('ACCOUNT_PROOF_IMAGE_UNAVAILABLE');
    context.drawImage(image, 0, 0); const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(v => v ? resolve(v) : reject(Error('ACCOUNT_PROOF_IMAGE_UNAVAILABLE')), 'image/png'));
    return { bytes: embedAccountProofPng(new Uint8Array(await png.arrayBuffer()), original.bytes), filename: original.filename.replace(/\.json$/u, '.png') };
  } finally { URL.revokeObjectURL(url); }
}
