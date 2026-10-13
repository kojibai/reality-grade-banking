// Operator-selected shipping metadata. Neither this address nor the public
// alias admits a receipt issuer, physical possession, ownership or funds.
export interface DeliveryInstructions {
  schema: 'receiz.bank.delivery-instructions.v1'; recipient: string;
  publicAlias: string; addressLines: string[]; reference: string;
}
export const RECEIZ_DELIVERY_DESTINATION = {
  recipient: 'Receiz', publicAlias: 'receiz',
  addressLines: ['1270 Ave of the Americas, 7th Fl', 'New York, NY 10020', 'United States'],
} as const;
export function physicalDeliveryInstructions(reference: string): DeliveryInstructions {
  return { schema: 'receiz.bank.delivery-instructions.v1', recipient: RECEIZ_DELIVERY_DESTINATION.recipient, publicAlias: RECEIZ_DELIVERY_DESTINATION.publicAlias, addressLines: [...RECEIZ_DELIVERY_DESTINATION.addressLines], reference };
}
export function readDeliveryInstructions(value: unknown, requestId: unknown): DeliveryInstructions {
  if (!value || typeof value !== 'object') throw new Error('Invalid delivery instructions.');
  const data = value as Record<string, unknown>;
  const text = (input: unknown): input is string => typeof input === 'string' && input.length > 0 && input.length <= 160 && !/[\u0000-\u001f\u007f]/.test(input);
  if (data.schema !== 'receiz.bank.delivery-instructions.v1' || !text(data.recipient) || !text(data.publicAlias) || !/^[a-z0-9_]{1,64}$/.test(data.publicAlias) || !text(data.reference) || data.reference !== requestId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data.reference) || !Array.isArray(data.addressLines) || data.addressLines.length < 1 || data.addressLines.length > 5 || !data.addressLines.every(text)) throw new Error('Invalid delivery instructions for this request.');
  return { schema: data.schema, recipient: data.recipient, publicAlias: data.publicAlias, addressLines: [...data.addressLines], reference: data.reference };
}
