import { it, expect } from 'vitest';
import { exitMeeting } from '../src/features/meeting/meeting-exit';
it('stops media immediately while recording delivery is still pending, and preserves its error', async () => { let fail!: (value: unknown) => void, stopped = false; const pending = new Promise<void>((_, reject) => { fail = reject; }); const exit = exitMeeting({ stopCapture: () => pending, depart: async () => { stopped = true; } }); expect(stopped).toBe(true); fail(Error('recording status offline')); expect((await exit)[0]).toHaveProperty('message', 'recording status offline'); });
