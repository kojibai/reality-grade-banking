import type { NativeCurrencyPreset } from '../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';

export const currencyPresets = {
  currency: { label: 'Currency', use: 'A unit people can buy, send, and trade.', placeholder: 'Where people can use your currency' },
  'service-credit': { label: 'Service credit', use: 'Credits people can use for a service.', placeholder: 'What one credit covers and how to book or redeem it' },
  coupon: { label: 'Coupon', use: 'Units people can use toward an offer.', placeholder: 'The offer, where to use it, and any conditions' },
  rewards: { label: 'Rewards', use: 'Units for a loyalty or rewards program.', placeholder: 'How people earn rewards and what they can use them for' },
} satisfies Record<NativeCurrencyPreset, { label: string; use: string; placeholder: string }>;
