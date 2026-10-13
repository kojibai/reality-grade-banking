import { publicClient } from './client';
import type { WalletLedgerFeed } from '@receiz/sdk';
export function publicActor(identity: { actor: string; username: string; publicName: boolean }): string { return identity.publicName && identity.username.trim() ? `@${identity.username.trim()}` : identity.actor; }
export function appendLedgerEvents<T extends { id: string }>(known: T[], additions: T[]): T[] { const ids = new Set(known.map(event => event.id)); return [...known, ...additions.filter(event => { if (ids.has(event.id)) return false; ids.add(event.id); return true; })]; }
export async function readPublicLedger(cursor?: string): Promise<WalletLedgerFeed> { return (await publicClient()).wallet.publicLedger({ limit: 20, cursor }); }
