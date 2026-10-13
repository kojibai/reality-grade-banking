import { expect, it } from 'vitest';
import { eventAmountPrefix } from '../src/core/activity';
it('shows ownership leaving the account as an outflow and exchange as a movement', () => { expect(eventAmountPrefix('send-asset')).toBe('−'); expect(eventAmountPrefix('send')).toBe('−'); expect(eventAmountPrefix('exchange')).toBe(''); expect(eventAmountPrefix('sell')).toBe('+'); });
