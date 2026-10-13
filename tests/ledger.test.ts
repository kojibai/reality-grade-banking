import { expect, it } from 'vitest';
import { appendLedgerEvents, publicActor } from '../src/receiz/ledger';
it('keeps cryptographic identity until a username is explicitly opted in', () => { expect(publicActor({ actor: '1A7B', username: 'jordan', publicName: false })).toBe('1A7B'); expect(publicActor({ actor: '1A7B', username: 'jordan', publicName: true })).toBe('@jordan'); });
it('appends new public history without replacing known event IDs', () => expect(appendLedgerEvents([{ id: 'one', amount: '10' }], [{ id: 'one', amount: '999' }, { id: 'two', amount: '20' }])).toEqual([{ id: 'one', amount: '10' }, { id: 'two', amount: '20' }]));
