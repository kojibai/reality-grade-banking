/** Coded, transparent illustration. Evidence travels; private authority stays separate. */
export function protectionArt(suffix='hero'){
 const id='protect-'+String(suffix).replace(/[^a-z0-9-]/gi,'');
 return `<svg class="vp-art" viewBox="0 0 720 590" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 <defs>
 <linearGradient id="${id}-metal" x2=".85" y2="1"><stop stop-color="#fff"/><stop offset=".26" stop-color="#e3eaf3"/><stop offset=".47" stop-color="#fbfdff"/><stop offset="1" stop-color="#9cabc1"/></linearGradient>
 <linearGradient id="${id}-side" x2="1" y2=".6"><stop stop-color="#e6edf6"/><stop offset=".48" stop-color="#c8d4e4"/><stop offset="1" stop-color="#94a6bf"/></linearGradient>
 <linearGradient id="${id}-glass" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="#e0ebfc" stop-opacity=".2"/><stop offset=".51" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#c0d3ed" stop-opacity=".5"/></linearGradient>
 <linearGradient id="${id}-blue" x2=".7" y2="1"><stop stop-color="#618bff"/><stop offset=".42" stop-color="#345ee9"/><stop offset="1" stop-color="#1339ab"/></linearGradient>
 <radialGradient id="${id}-shadow"><stop stop-color="#203859" stop-opacity=".18"/><stop offset="1" stop-color="#203859" stop-opacity="0"/></radialGradient>
 </defs>
 <ellipse cx="350" cy="501" rx="252" ry="50" fill="url(#${id}-shadow)"/>
 <g class="vp-evidence-stream" fill="none" stroke="#7493d3" stroke-width="1"><path d="M425 245C515 245 495 137 578 137" stroke-dasharray="3 7"/><path d="M130 337C172 337 167 314 209 314" stroke-opacity=".6"/></g>
 <g class="vp-safe">
 <path d="m224 183 224-36 77 61-224 40Z" fill="#edf3fc" stroke="#fff" stroke-width="2"/>
 <path d="m448 147 77 61v237l-77-45Z" fill="url(#${id}-side)" stroke="#bfccdf"/>
 <path d="m224 183 224-36v253l-224 39Z" fill="url(#${id}-metal)" stroke="#d8e2f0" stroke-width="2"/>
 <path d="m245 203 179-29v207l-179 31Z" fill="#102b51" stroke="#fff" stroke-width="2"/>
 <path d="m260 224 145-23v165l-145 26Z" fill="#dce7fa"/>
 <path d="m274 257 64-11 19 16-65 11Z" fill="#a8c0ff"/><path d="m274 257 18 16v77l-18-16Z" fill="#1a3b9d"/><path d="m292 273 65-11v77l-65 11Z" fill="url(#${id}-blue)"/>
 <path d="m308 293 33-6m-33 17 33-6m-33 17 21-4" stroke="#e8efff" stroke-width="2" stroke-linecap="round"/>
 <path d="m359 221 30-5v98l-30 5Z" fill="#f7faff" stroke="#a1b4d6"/><path d="m366 235 16-3m-16 12 16-3m-16 12 11-2" stroke="#819bc7" stroke-width="1.5"/>
 <path d="m245 203 179-29v207l-179 31Z" fill="url(#${id}-glass)" stroke="#f7fbff" stroke-width="2"/>
 <path d="m257 214 155-25" stroke="white" stroke-width="2"/>
 <path d="M277 382 411 194" stroke="white" stroke-opacity=".55" stroke-width="14"/>
 <ellipse cx="383" cy="336" rx="19" ry="23" fill="url(#${id}-metal)" stroke="#f9fcff" stroke-width="2"/>
 <ellipse cx="383" cy="336" rx="12" ry="15" fill="#eef4fc" stroke="#b7c6da"/>
 <path d="M383 325v13l7 4" fill="none" stroke="#536c94" stroke-width="2" stroke-linecap="round"/>
 <path d="m234 431 204-34m20-233 57 45v226" fill="none" stroke="#fff" stroke-opacity=".7"/>
 <path d="M233 226v27m0 102v27" stroke="#a2b2c8" stroke-width="4" stroke-linecap="round"/>
 </g>
 <g class="vp-passkey">
 <path d="m93 287 55-9 13 12v88l-55 10-13-12Z" fill="url(#${id}-metal)" stroke="#d0dced"/>
 <path d="m106 300 55-10v88l-55 10Z" fill="url(#${id}-glass)" stroke="#fff"/>
 <ellipse cx="133" cy="325" rx="10" ry="12" fill="none" stroke="#3158c6" stroke-width="3"/>
 <path d="M133 337v23m0-7 8-2" stroke="#3158c6" stroke-width="3" stroke-linecap="round"/>
 <circle cx="125" cy="376" r="2" fill="#527ae0"/>
 </g>
 <g class="vp-public-proof">
 <path d="m553 78 85 18 16 19v112l-85-20-16-17Z" fill="url(#${id}-metal)" stroke="#d6e2f3"/>
 <path d="m569 97 85 18v112l-85-20Z" fill="url(#${id}-glass)" stroke="#fff" stroke-width="2"/>
 <path d="m585 121 51 11m-51 53 51 11m-51-2 28 6" stroke="#a0b6d9" stroke-width="1.5"/>
 <path d="m611 140 16 13-16 17-16-24Z" fill="url(#${id}-blue)"/>
 <path d="m605 151 5 5 8-7" fill="none" stroke="#fff" stroke-width="2"/>
 </g>
 <g class="vp-copy-file">
 <path d="m560 333 64 13 12 15v78l-64-14-12-15Z" fill="url(#${id}-glass)" stroke="#b9c9e3"/>
 <path d="m578 363 36 8m-36 4 36 8m-36 4 21 5" stroke="#99aed0"/>
 <path d="M546 387h-27m7-7-7 7 7 7" fill="none" stroke="#4567bb" stroke-width="1.5"/>
 <circle cx="510" cy="387" r="13" fill="#fbfcfe" stroke="#4567bb"/>
 <path d="M505 381v-2a5 5 0 0 1 10 0v2m-11 0h12v11h-12Z" fill="#edf2ff" stroke="#4567bb" stroke-width="1.5"/>
 </g>
 <g class="vp-proof-change"><path d="m580 142 53 11m-53 0 53 11" stroke="#a77e60" stroke-width="2"/><path d="m586 174 39-30m-39 19 39 1" stroke="#a77e60" stroke-width="2"/></g>
 </svg>`;
}
