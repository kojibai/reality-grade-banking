import { createNativeCallController, type NativeCallSummary } from './native-calls';
import type { OpenIdentity } from './native-identity';
import type { NativeMessaging } from './native-messaging';
import { bankMeetingPath } from './meeting-links';
export interface MeetingView {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    host: {
        username: string;
        displayName: string;
    };
    twin: boolean;
    recording: boolean;
    url: string;
}
export interface JoinedMeeting {
    identity: OpenIdentity;
    messaging: NativeMessaging;
    meeting: MeetingView;
    conversationId: string;
    viewerId: string;
    hostId: string;
    isHost: boolean;
    attendees: string[];
    calendarSaved?: Promise<unknown>;
    sharedContext: string;
    controller: ReturnType<typeof createNativeCallController>;
}
export function createMeetingSession(input: {
    eventId: string;
    key: string;
    request: (path: string, init?: RequestInit) => Promise<Response>;
    entry: {
        open(): Promise<OpenIdentity>;
        close(): void;
    };
    controller?: typeof createNativeCallController;
}) {
    const path = `/api/calendar/meetings/${input.eventId}/${input.key}`;
    let held: MeetingView | null = null, joined: JoinedMeeting | null = null, pending: Promise<JoinedMeeting> | null = null, closed = false;
    const assertOpen = () => { if (closed)
        throw Error('MEETING_CLOSED'); };
    const read = (value: unknown): MeetingView => { const v = value as MeetingView; if (!v || v.id !== input.eventId || !bankMeetingPath(v.url) || !v.host || typeof v.title !== 'string')
        throw Error('MEETING_UNAVAILABLE'); return v; };
    return { path, known: () => held,
        async read() { assertOpen(); if (held)
            return held; const response = await input.request(path), data = await response.json(); assertOpen(); if (!response.ok || !data.ok)
            throw Error('MEETING_UNAVAILABLE'); return held = read(data.meeting); },
        join(): Promise<JoinedMeeting> { if (closed)
            return Promise.reject(Error('MEETING_CLOSED')); if (joined)
            return Promise.resolve(joined); if (pending)
            return pending; const task = (async () => { const identity = await input.entry.open(), messaging = await identity.messaging!(true); assertOpen(); const response = await messaging.callTransport.heldFetch(path, { method: 'POST' }), data = await response.json(); assertOpen(); if (!response.ok || data.ok !== true || data.viewerId !== messaging.accountUid || data.conversationId !== input.eventId || data.call?.conversationId !== input.eventId || typeof data.hostId !== 'string' || data.isHost !== (data.viewerId === data.hostId))
            throw Error('MEETING_ADMISSION_UNCONFIRMED'); const meeting = read(data.meeting), controller = (input.controller ?? createNativeCallController)({ identity: messaging.callTransport, conversationId: input.eventId, userId: data.viewerId, activityHints:true,initialCallId:data.call.id,initialCall: data.call as NativeCallSummary }); held = meeting; const calendarSaved = data.isHost || !identity.organizer ? undefined : identity.organizer().then(api => api.saveEvent({ title: meeting.title, startAt: meeting.startAt, endAt: meeting.endAt, meetingAttendance: { eventId: input.eventId, key: input.key } })); void calendarSaved?.catch(() => { }); return joined = { calendarSaved, identity, messaging, meeting, controller, conversationId: input.eventId, viewerId: data.viewerId, hostId: data.hostId, isHost: data.isHost, attendees: Array.isArray(data.attendees) ? data.attendees : [], sharedContext: typeof data.sharedContext === 'string' ? data.sharedContext : '' }; })(); pending = task; void task.finally(() => { if (pending === task)
            pending = null; }).catch(() => { }); return task; },
        async close() { if (closed)
            return; closed = true; await joined?.controller.close(); input.entry.close(); },
    };
}
export type MeetingSession = ReturnType<typeof createMeetingSession>;
