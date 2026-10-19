import { useId } from 'react';
import './account-opening.css';

export type OpeningStage = 'identity' | 'history' | 'ready';

/** Visual ceremony follows real entry checkpoints. It never owns a timer,
 * signer, request or minimum duration, and is not mounted on device resume. */
export function AccountOpening({ stage = 'identity', inspecting = false }: { stage?: OpeningStage; inspecting?: boolean }) {
  const id = useId(), phase = inspecting ? 'inspection' : stage;
  const detail = inspecting ? 'Reading your Identity Seal' : stage === 'ready' ? 'Your account view is ready' : stage === 'history' ? 'Loading your account history' : 'Preparing your identity';
  const completed = inspecting ? 0 : stage === 'ready' ? 2 : stage === 'history' ? 1 : 0;
  const progressText = inspecting
    ? '0 of 2 checkpoints complete. Reading the Identity Seal; identity preparation has not finished.'
    : stage === 'ready' ? '2 of 2 checkpoints complete. Your account view is ready.'
    : stage === 'history' ? '1 of 2 checkpoints complete. Identity preparation finished; preparing your account view.'
    : '0 of 2 checkpoints complete. Preparing and verifying your identity.';

  return <div className="account-opening account-opening-screen" data-phase={phase} aria-busy={inspecting || stage !== 'ready'}>
    <div className="account-opening-portal" aria-hidden="true">
      <div className="account-opening-horizon" />
      <div className="account-opening-field"><span/><span/><span/><span/></div>
      <div className="account-opening-orbital-plane"><div className="account-opening-orbit account-opening-orbit-outer"/><div className="account-opening-orbit account-opening-orbit-middle"/><div className="account-opening-orbit account-opening-orbit-inner"/></div>
      <div className="account-opening-art">
        <svg className="account-opening-geometry" viewBox="0 0 480 480" fill="none" focusable="false" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-light`} x1="80" y1="72" x2="390" y2="414" gradientUnits="userSpaceOnUse"><stop stopColor="#fffdf7"/><stop offset=".47" stopColor="#d8e6ff"/><stop offset="1" stopColor="#6686c3"/></linearGradient>
            <linearGradient id={`${id}-stone`} x1="177" y1="150" x2="305" y2="338" gradientUnits="userSpaceOnUse"><stop stopColor="#fffef9"/><stop offset=".5" stopColor="#edf3fc"/><stop offset="1" stopColor="#91afd6"/></linearGradient>
            <linearGradient id={`${id}-edge`} x1="156" y1="90" x2="328" y2="384" gradientUnits="userSpaceOnUse"><stop stopColor="#e7f0ff" stopOpacity=".9"/><stop offset=".4" stopColor="#7094dc" stopOpacity=".12"/><stop offset="1" stopColor="#98b6f0" stopOpacity=".5"/></linearGradient>
          </defs>
          <g className="account-opening-register" stroke="#b8ccef">
            <circle cx="240" cy="240" r="220" strokeOpacity=".12"/>
            <circle cx="240" cy="240" r="210" strokeOpacity=".25" strokeDasharray=".6 10.4"/>
            <circle cx="240" cy="240" r="194" strokeOpacity=".09"/>
            <path d="M240 5v18m0 434v18M5 240h18m434 0h18M74 74l13 13m306 306 13 13M74 406l13-13M393 87l13-13" strokeOpacity=".5"/>
            <path d="M125 158v-33h33m164 0h33v33m0 164v33h-33m-164 0h-33v-33" strokeOpacity=".16"/>
          </g>
          <g className="account-opening-radial-track" stroke={`url(#${id}-light)`}>
            <path d="M48 240a192 192 0 0 1 384 0" strokeWidth="1.2"/>
            <path d="M336 406.3A192 192 0 0 1 73.7 336" strokeOpacity=".3"/>
            <circle cx="432" cy="240" r="3" fill="#e7f1ff" stroke="none"/>
            <circle cx="48" cy="240" r="2" fill="#6c92e0" stroke="none"/>
          </g>
          <g className="account-opening-seal">
            <path d="m240 89 130.8 75.5v151L240 391l-130.8-75.5v-151L240 89Z" fill="#b8d4ff" fillOpacity=".025" stroke={`url(#${id}-edge)`}/>
            <path d="m240 102 119.5 69v138L240 378l-119.5-69V171L240 102Z" stroke="#a3bdec" strokeOpacity=".12"/>
            <path d="m240 119 104.8 60.5v121L240 361l-104.8-60.5v-121L240 119Z" fill="#172e4a" fillOpacity=".65" stroke="#aac7ef" strokeOpacity=".2"/>
            <path d="M240 119v26m104.8 34.5-22.5 13M344.8 300.5l-22.5-13M240 361v-26m-104.8-34.5 22.5-13M135.2 179.5l22.5 13" stroke="#b8cef0" strokeOpacity=".5"/>
            <g fill={`url(#${id}-stone)`}>
              <path d="m240 163 73 40v10H167v-10l73-40Zm0 16-45 24h90l-45-24Z" fillRule="evenodd"/>
              <rect x="175" y="222" width="17" height="65" rx="1.5"/><rect x="213" y="222" width="17" height="65" rx="1.5"/><rect x="251" y="222" width="17" height="65" rx="1.5"/><rect x="289" y="222" width="17" height="65" rx="1.5"/>
              <rect x="167" y="294" width="146" height="10" rx="1.5"/><rect x="159" y="312" width="162" height="11" rx="2"/>
            </g>
            <path className="account-opening-seal-glint" d="m166 204 74-40 74 40M160 313h161" stroke="#fffef9" strokeOpacity=".65" strokeWidth=".8"/>
          </g>
        </svg>
      </div>
      <div className="account-opening-arrival"><span/><span/></div>
    </div>
    <p className="account-opening-status sr-only" role="status" aria-live="polite" aria-atomic="true"><span>Opening your account. </span><strong>{detail}</strong></p>
    <div className="account-opening-progress" role="progressbar" aria-label="Account opening checkpoints" aria-valuemin={0} aria-valuemax={2} aria-valuenow={completed} aria-valuetext={progressText}><span style={{transform:`scaleX(${completed / 2})`}}/></div>
  </div>;
}
