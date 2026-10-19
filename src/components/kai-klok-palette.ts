// Bankeiz presentation tones, authorized separately from canonical Kai color
// metadata in kai-klok.ts. Light/dark variants retain each category's hue family.
export const BANK_KAI_PALETTE = {
  light: {
    phases: ['#985354', '#A3744F', '#998347', '#527B6A', '#527A8F', '#807193'],
    days: ['#9C5755', '#A57550', '#9D874D', '#557F6C', '#577F8A', '#867699'],
    months: ['#9A5050', '#A66F43', '#9C8241', '#527957', '#50748D', '#656185', '#747F8E', '#577E87'],
    weeks: ['#9D5857', '#A3784C', '#9D8446', '#526D8D', '#625C85', 'linear-gradient(135deg,#80778F,#B2B7BD)', 'linear-gradient(135deg,#FCFAF2,#B29A63,#EEE9DA)'],
    monthPrism: 'linear-gradient(135deg,#577E87 0%,#7F6D94 48%,#A0824C 100%)',
  },
  dark: {
    phases: ['#BD8783', '#C5A081', '#C9B683', '#91B09E', '#8BAABA', '#AFA2C2'],
    days: ['#C18B87', '#C9A181', '#CDBA87', '#94B4A1', '#91B4BF', '#B6A5C8'],
    months: ['#BD8884', '#C5A081', '#C2AE79', '#90AB90', '#8CA9BC', '#A29ABF', '#BCC5D1', '#91B5B8'],
  },
} as const;

export function bankKaiMomentTones(moment: { beat: number; day: number; month: number }, surface: 'light' | 'dark') {
  const palette = BANK_KAI_PALETTE[surface];
  return { phase: palette.phases[Math.floor(moment.beat / 6)], day: palette.days[(moment.day - 1) % 6], month: palette.months[moment.month - 1] };
}

/** Original 36-marker hue positions; only display saturation/lightness change. */
export function bankKaiBeatTone(index: number) {
  return `hsl(${((index + 33) % 36) / 36 * 360},35%,62%)`;
}
