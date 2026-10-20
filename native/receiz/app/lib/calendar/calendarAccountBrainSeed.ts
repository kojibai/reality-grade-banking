"use client";

import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";

export type CalendarAccountBrainSeedEvent = {
  id: string;
  pulse?: unknown;
  title?: unknown;
  kind?: unknown;
  source?: unknown;
  startAt: string;
  endAt: string;
  attendees?: unknown;
  location?: unknown;
  note?: unknown;
  metadata?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CalendarAccountBrainSeed = {
  ownerUid: string;
  username?: string | null;
  loadedAt: string;
  expiresAt: number;
  connectedActionCount: number | null;
  events: CalendarAccountBrainSeedEvent[];
};

const CALENDAR_ACCOUNT_BRAIN_SEED_KEY = "receiz:calendar:account-brain-seed:v1";
const CALENDAR_ACCOUNT_BRAIN_DURABLE_REGISTER_KEY_PREFIX = "receiz.calendar.account-brain.register.v1";
const CALENDAR_ACCOUNT_BRAIN_SEED_TTL_MS = 10 * 60 * 1000;
const CALENDAR_ACCOUNT_BRAIN_SEED_EVENT_LIMIT = 5_000;
const CALENDAR_ACCOUNT_BRAIN_DURABLE_SCHEMA = "receiz.calendar.account-brain.register.v1";

type CalendarAccountBrainStored = CalendarAccountBrainSeed & {
  schema?: typeof CALENDAR_ACCOUNT_BRAIN_DURABLE_SCHEMA;
  version?: 1;
};

function readSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function normalizeOwnerUid(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function durableRegisterKey(ownerUid: string): string {
  return `${CALENDAR_ACCOUNT_BRAIN_DURABLE_REGISTER_KEY_PREFIX}:${ownerUid}`;
}

function normalizeUsername(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : null;
}

function normalizeEvent(value: unknown): CalendarAccountBrainSeedEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const event = value as CalendarAccountBrainSeedEvent;
  if (typeof event.id !== "string" || !event.id.trim()) return null;
  if (typeof event.startAt !== "string" || !event.startAt.trim()) return null;
  if (typeof event.endAt !== "string" || !event.endAt.trim()) return null;
  return {
    ...event,
    id: event.id.trim(),
    startAt: event.startAt.trim(),
    endAt: event.endAt.trim(),
  };
}

function eventSortMs(event: CalendarAccountBrainSeedEvent): number {
  const start = Date.parse(event.startAt);
  if (Number.isFinite(start)) return start;
  const created = typeof event.createdAt === "string" ? Date.parse(event.createdAt) : Number.NaN;
  return Number.isFinite(created) ? created : 0;
}

function eventUpdatedMs(event: CalendarAccountBrainSeedEvent): number {
  const updated = typeof event.updatedAt === "string" ? Date.parse(event.updatedAt) : Number.NaN;
  if (Number.isFinite(updated)) return updated;
  const created = typeof event.createdAt === "string" ? Date.parse(event.createdAt) : Number.NaN;
  if (Number.isFinite(created)) return created;
  return eventSortMs(event);
}

function chooseCalendarEvent(
  current: CalendarAccountBrainSeedEvent | undefined,
  incoming: CalendarAccountBrainSeedEvent,
): CalendarAccountBrainSeedEvent {
  if (!current) return incoming;
  if (eventUpdatedMs(incoming) < eventUpdatedMs(current)) return current;
  return {
    ...current,
    ...Object.fromEntries(Object.entries(incoming).filter(([, value]) => value !== undefined)),
  } as CalendarAccountBrainSeedEvent;
}

export function mergeCalendarAccountBrainSeedEvents(
  current: readonly unknown[],
  incoming: readonly unknown[],
  limit: number | null = CALENDAR_ACCOUNT_BRAIN_SEED_EVENT_LIMIT,
): CalendarAccountBrainSeedEvent[] {
  const byId = new Map<string, CalendarAccountBrainSeedEvent>();
  for (const value of current) {
    const event = normalizeEvent(value);
    if (!event) continue;
    byId.set(event.id, chooseCalendarEvent(byId.get(event.id), event));
  }

  for (const value of incoming) {
    const event = normalizeEvent(value);
    if (!event) continue;
    byId.set(event.id, chooseCalendarEvent(byId.get(event.id), event));
  }

  const rows = Array.from(byId.values()).sort((left, right) => {
    const startDiff = eventSortMs(right) - eventSortMs(left);
    if (startDiff !== 0) return startDiff;
    const updatedDiff = eventUpdatedMs(right) - eventUpdatedMs(left);
    if (updatedDiff !== 0) return updatedDiff;
    return right.id.localeCompare(left.id);
  });

  return limit === null ? rows : rows.slice(0, Math.max(0, Math.trunc(limit)));
}

function normalizeEvents(events: readonly unknown[], limit: number | null = CALENDAR_ACCOUNT_BRAIN_SEED_EVENT_LIMIT): CalendarAccountBrainSeedEvent[] {
  return mergeCalendarAccountBrainSeedEvents([], events, limit);
}

function normalizeSeed(value: unknown, options?: { requireFresh?: boolean; eventLimit?: number | null }): CalendarAccountBrainSeed | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const ownerUid = normalizeOwnerUid(typeof record.ownerUid === "string" ? record.ownerUid : null);
  const loadedAt = typeof record.loadedAt === "string" ? record.loadedAt : "";
  const expiresAt = typeof record.expiresAt === "number" && Number.isFinite(record.expiresAt) ? record.expiresAt : 0;
  const rawEvents = Array.isArray(record.events) ? record.events : [];
  if (!ownerUid || !loadedAt) return null;
  if (options?.requireFresh !== false && expiresAt <= Date.now()) return null;

  return {
    ownerUid,
    username: normalizeUsername(record.username),
    loadedAt,
    expiresAt,
    connectedActionCount: typeof record.connectedActionCount === "number" ? record.connectedActionCount : null,
    events: normalizeEvents(rawEvents, options?.eventLimit),
  };
}

function readSessionSeed(ownerUid: string): CalendarAccountBrainSeed | null {
  const storage = readSessionStorage();
  if (!storage) return null;

  try {
    const seed = normalizeSeed(JSON.parse(storage.getItem(CALENDAR_ACCOUNT_BRAIN_SEED_KEY) ?? "null"));
    if (!seed || seed.ownerUid !== ownerUid || seed.events.length === 0) return null;
    return seed;
  } catch {
    return null;
  }
}

function readDurableSeed(ownerUid: string): CalendarAccountBrainSeed | null {
  const raw = readDurableLocalTruthItem(durableRegisterKey(ownerUid)) ?? "";
  if (!raw) return null;

  try {
    const seed = normalizeSeed(JSON.parse(raw), { requireFresh: false, eventLimit: null });
    if (!seed || seed.ownerUid !== ownerUid || seed.events.length === 0) {
      removeDurableLocalTruthItem(durableRegisterKey(ownerUid));
      return null;
    }
    return seed;
  } catch {
    removeDurableLocalTruthItem(durableRegisterKey(ownerUid));
    return null;
  }
}

function writeSessionSeed(seed: CalendarAccountBrainSeed): void {
  const storage = readSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(CALENDAR_ACCOUNT_BRAIN_SEED_KEY, JSON.stringify(seed));
  } catch {
    // Session mirroring is convenience only; durable proof memory remains the register.
  }
}

export function readCalendarAccountBrainSeed(ownerUid: string): CalendarAccountBrainSeed | null {
  const targetOwnerUid = normalizeOwnerUid(ownerUid);
  if (!targetOwnerUid) return null;

  const durableSeed = readDurableSeed(targetOwnerUid);
  if (durableSeed) {
    writeSessionSeed({
      ...durableSeed,
      expiresAt: Date.now() + CALENDAR_ACCOUNT_BRAIN_SEED_TTL_MS,
    });
    return durableSeed;
  }

  return readSessionSeed(targetOwnerUid);
}

export function writeCalendarAccountBrainSeed(args: {
  ownerUid: string;
  username?: string | null;
  events: readonly unknown[];
  connectedActionCount: number | null;
  loadedAt?: string;
}): void {
  const ownerUid = normalizeOwnerUid(args.ownerUid);
  if (!ownerUid) return;

  const existing = readDurableSeed(ownerUid) ?? readSessionSeed(ownerUid);
  const events = mergeCalendarAccountBrainSeedEvents(existing?.events ?? [], args.events, null);
  if (events.length === 0) return;
  const loadedAt = args.loadedAt ?? new Date().toISOString();
  const seed: CalendarAccountBrainSeed = {
    ownerUid,
    username: normalizeUsername(args.username) ?? existing?.username ?? null,
    loadedAt,
    expiresAt: Date.now() + CALENDAR_ACCOUNT_BRAIN_SEED_TTL_MS,
    connectedActionCount: args.connectedActionCount ?? existing?.connectedActionCount ?? null,
    events: normalizeEvents(events, CALENDAR_ACCOUNT_BRAIN_SEED_EVENT_LIMIT),
  };
  const durableSeed: CalendarAccountBrainStored = {
    ...seed,
    schema: CALENDAR_ACCOUNT_BRAIN_DURABLE_SCHEMA,
    version: 1,
    expiresAt: Number.MAX_SAFE_INTEGER,
    events,
  };

  writeDurableLocalTruthItem(durableRegisterKey(ownerUid), JSON.stringify(durableSeed), {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock + Math.min(events.length, 200),
    source: "calendar-account-brain-register",
    allowSameRankOverwrite: true,
  });
  writeSessionSeed(seed);
}

export function appendCalendarAccountBrainSeedEvent(args: {
  ownerUid: string;
  event: CalendarAccountBrainSeedEvent;
  connectedActionCount: number | null;
  loadedAt?: string;
}): void {
  const existing = readCalendarAccountBrainSeed(args.ownerUid);
  const events = normalizeEvents([args.event, ...(existing?.events ?? [])]);
  writeCalendarAccountBrainSeed({
    ownerUid: args.ownerUid,
    events,
    connectedActionCount: args.connectedActionCount ?? existing?.connectedActionCount ?? null,
    loadedAt: args.loadedAt,
  });
}
