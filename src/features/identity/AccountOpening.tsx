import { useId } from 'react';
import './account-opening.css';

export type OpeningStage = 'identity' | 'history' | 'ready';

export function AccountOpening({ stage = 'identity', inspecting = false }: { stage?: OpeningStage; inspecting?: boolean }) {
  const id = useId();
  const phase = inspecting ? 'inspection' : stage;
  const detail = inspecting ? 'Reading your Identity Seal' : stage === 'ready' ? 'Your account view is ready' : stage === 'history' ? 'Loading your account history' : 'Preparing your identity';
  const completed = inspecting ? 0 : stage === 'ready' ? 2 : stage === 'history' ? 1 : 0;
  const progressText = inspecting
    ? '0 of 2 checkpoints complete. Reading the Identity Seal; identity preparation has not finished.'
    : stage === 'ready' ? '2 of 2 checkpoints complete. Your account view is ready.'
    : stage === 'history' ? '1 of 2 checkpoints complete. Identity preparation finished; preparing your account view.'
    : '0 of 2 checkpoints complete. Preparing and verifying your identity.';

  return <div className="account-opening" data-phase={phase}>
    <div className="account-opening-art" aria-hidden="true">
      <svg className="account-opening-geometry" viewBox="0 0 144 144" fill="none" aria-hidden="true" focusable="false">
        <circle cx="72" cy="72" r="63" stroke="currentColor" strokeOpacity=".14" />
        <circle cx="72" cy="72" r="58" stroke="currentColor" strokeOpacity=".25" strokeDasharray="1 7.1" />
        <circle cx="72" cy="72" r="45" stroke="currentColor" strokeOpacity=".12" />
        <path d="M72 5v6m0 122v6M5 72h6m122 0h6M24.6 24.6l4.2 4.2m86.4 86.4 4.2 4.2M24.6 119.4l4.2-4.2m86.4-86.4 4.2-4.2" stroke="currentColor" strokeOpacity=".4" />
        <path d="M49 45h-4v10m50-10h4v10M45 89v10h4m46 0h4V89" stroke="currentColor" strokeOpacity=".35" />
      </svg>
      <div className="account-opening-orbit account-opening-orbit-outer">
        <svg viewBox="0 0 144 144" fill="none" aria-hidden="true" focusable="false">
          <defs><linearGradient id={`${id}-arc`} x1="19" y1="72" x2="125" y2="72" gradientUnits="userSpaceOnUse"><stop stopColor="currentColor" stopOpacity="0" /><stop offset="1" stopColor="currentColor" stopOpacity=".8" /></linearGradient></defs>
          <path d="M19 72a53 53 0 0 1 106 0" stroke={`url(#${id}-arc)`} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M98.5 117.9A53 53 0 0 1 26.1 98.5" stroke="currentColor" strokeOpacity=".25" strokeLinecap="round" />
          <circle cx="125" cy="72" r="2.2" fill="currentColor" />
        </svg>
      </div>
      <div className="account-opening-orbit account-opening-orbit-inner">
        <svg viewBox="0 0 144 144" fill="none" aria-hidden="true" focusable="false">
          <path d="M34 72a38 38 0 0 1 38-38m38 38a38 38 0 0 1-38 38" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M38 55.1a38 38 0 0 1 5.4-8.2m57.2 50.2a38 38 0 0 1-5.5 5.5" stroke="currentColor" strokeOpacity=".25" strokeLinecap="round" />
        </svg>
      </div>
      <div className="account-opening-seal">
        <svg viewBox="0 0 144 144" fill="none" aria-hidden="true" focusable="false">
          <defs><linearGradient id={`${id}-seal`} x1="53" y1="49" x2="91" y2="95" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" /><stop offset="1" stopColor="#edf2ff" /></linearGradient></defs>
          <path d="m72 47 21.7 12.5v25L72 97 50.3 84.5v-25L72 47Z" fill={`url(#${id}-seal)`} stroke="currentColor" strokeOpacity=".65" strokeWidth="1.1" />
          <path d="m72 55 14.7 8.5v17L72 89l-14.7-8.5v-17L72 55Z" stroke="currentColor" strokeOpacity=".22" />
          <path d="M66 79V67l6-3.5 6 3.5v12l-6 3.5-6-3.5Zm6-15.5v19M66 67l12 12m0-12L66 79" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
    <div className="account-opening-copy">
      <p className="account-opening-status" role="status" aria-live="polite" aria-atomic="true">
        <span className="account-opening-label">Opening your account</span>
        <strong>{detail}</strong>
      </p>
      <div className="account-opening-progress" role="progressbar" aria-label="Account opening checkpoints" aria-valuemin={0} aria-valuemax={2} aria-valuenow={completed} aria-valuetext={progressText}>
        <span style={{ transform: `scaleX(${completed / 2})` }} />
      </div>
      <span className="account-opening-progress-caption" aria-hidden="true"><span data-complete={completed >= 1}>Identity</span><span data-complete={completed >= 2}>Account</span></span>
    </div>
  </div>;
}
