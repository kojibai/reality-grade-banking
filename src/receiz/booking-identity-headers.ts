export const BOOKING_IDENTITY_HEADERS=['x-receiz-local-action-id','x-receiz-local-action-key-id','x-receiz-local-action-public-key','x-receiz-local-action-challenge','x-receiz-local-action-signature'] as const;
export type BookingIdentityHeaders=Readonly<Record<typeof BOOKING_IDENTITY_HEADERS[number],string>>;
