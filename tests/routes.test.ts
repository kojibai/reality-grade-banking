import { expect, it } from 'vitest';
import { parseRoute, routeHash, sheetCloseBehavior } from '../src/core/routes';
it('retains the explicit Business review through a cold account entry',()=>expect(parseRoute('#account/business')).toEqual({panel:'account',sheet:{kind:'business'}}));
it('restores the exact asset ID from a shareable console reference', () => { const hash = routeHash('market', { kind: 'asset', assetId: 'rc_ABc:gold/1' }); expect(parseRoute(hash)).toEqual({ panel: 'market', sheet: { kind: 'asset', assetId: 'rc_ABc:gold/1' } }); });
it('retains the buy or sell review intent when restoring a console route', () => expect(parseRoute('#market/trade/gold/sell')).toEqual({ panel: 'market', sheet: { kind: 'trade', assetId: 'gold', mode: 'sell' } }));
it('falls back safely for malformed route encoding', () => expect(parseRoute('#assets/asset/%E0%A4%A')).toEqual({ panel: 'account', sheet: null }));
it('closes a directly opened sheet inside the console without leaving the document', () => { expect(sheetCloseBehavior({ sheet: { kind: 'profile' } })).toBe('replace'); expect(sheetCloseBehavior({ overlayEntry: true })).toBe('back'); });
it.each(['buy','sell']as const)('restores a manual Market %s with its exact Market item ID',side=>{const sheet={kind:'market-trade'as const,marketItemId:'asset:proof/one',side};expect(parseRoute(routeHash('market',sheet))).toEqual({panel:'market',sheet});});
it('preserves the selected chat recipient by stable account ID across a payment review route',()=>{
 const sheet={kind:'send' as const,recipient:{userId:'22222222-2222-4222-8222-222222222222',username:'mira'}};
 expect(parseRoute(routeHash('account',sheet))).toEqual({panel:'account',sheet});
 expect(parseRoute('#account/send/to/not-an-account/mira').sheet).not.toHaveProperty('recipient');
});

it('preserves the explicit assistant Business entry until the opening request is consumed',()=>{const route=parseRoute('#account/messages/business');expect(route).toEqual({panel:'account',sheet:{kind:'messages',business:true}});expect(routeHash(route.panel,route.sheet)).toBe('#account/messages/business');});

it('roundtrips an explicit nested Create Vault entry without changing ordinary identity',()=>{const sheet={kind:'profile' as const,vaults:'create' as const};expect(routeHash('account',sheet)).toBe('#account/profile/vaults/create');expect(parseRoute(routeHash('account',sheet))).toEqual({panel:'account',sheet});expect(parseRoute('#account/profile')).toEqual({panel:'account',sheet:{kind:'profile'}});expect(parseRoute('#account/profile/vaults/unknown').sheet).toEqual({kind:'profile'});});

it('round-trips a direct Settlement dropdown target inside the existing balance sheet',()=>{
 const action={kind:'balance' as const,focus:'settlement' as const};expect(routeHash('account',action)).toBe('#account/balance/settlement');expect(parseRoute('#account/balance/settlement')).toEqual({panel:'account',sheet:action});expect(routeHash('account',{kind:'balance'})).toBe('#account/balance');expect(parseRoute('#account/balance')).toEqual({panel:'account',sheet:{kind:'balance'}});
});
