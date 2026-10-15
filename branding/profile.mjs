import configuration from './identity.json' with { type: 'json' };

// This display-only profile cannot configure executable behavior or trust.
const fields = { wordmark: 24, descriptor: 16, applicationName: 64 };
if (Object.keys(configuration).length !== Object.keys(fields).length || Object.entries(fields).some(([key, limit]) => typeof configuration[key] !== 'string' || (key !== 'descriptor' && !configuration[key].trim()) || configuration[key].length > limit || /[\u0000-\u001f\u007f]/.test(configuration[key]))) throw Error('BRANDING_PROFILE_INVALID');
export const branding = Object.freeze({ ...configuration });
