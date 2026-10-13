export function eventAmountPrefix(kind: string): '+' | '−' | '' {
  if (['send', 'send-asset', 'backing', 'buy', 'redeem'].includes(kind)) return '−';
  if (['fund', 'sell', 'custody', 'accept-custody'].includes(kind)) return '+';
  return '';
}
