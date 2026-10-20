import { KaiTimeSource } from "@/app/utils/kai_pulse";

/**
 * Live profile-showcase causality is local Kai truth. The generic singleton
 * may intentionally carry a signed/override snapshot for deterministic render
 * contexts, so proof mutations use their own monotonic live source and then
 * resume from the stronger sealed predecessor head.
 */
export const profileShowcaseLiveKaiTimeSource = new KaiTimeSource({
  ignoreOverride: true,
});

export function profileShowcaseLiveKaiUpulse(): string {
  return profileShowcaseLiveKaiTimeSource.nowMicroPulses().toString();
}
