const coordinate = /^\/meet\/([a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12})\/([A-Za-z0-9_-]{16,160})\/$/i;
export function bankMeetingPath(value: unknown): string | null { if (typeof value !== 'string')
    return null; try {
    const url = new URL(value);
    return url.origin === 'https://bankeiz.com' && !url.search && !url.hash && coordinate.test(url.pathname) ? url.pathname : null;
}
catch {
    return null;
} }
export function meetingCoordinate(path: string) { const match = coordinate.exec(path); return match ? { eventId: match[1], key: match[2] } : null; }
