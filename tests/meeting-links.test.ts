import { describe, it, expect } from 'vitest';
import { bankMeetingPath } from '../src/receiz/meeting-links';
import { permittedNativeChatPath } from '../src/receiz/native-chat-paths';
const id = '11111111-1111-4111-8111-111111111111', key = 'abcdefghijklmnopqrstuvwx';
describe('native meeting coordinates', () => {
    it('projects only the confirmed Bankeiz room into a local route', () => { expect(bankMeetingPath(`https://bankeiz.com/meet/${id}/${key}/`)).toBe(`/meet/${id}/${key}/`); expect(bankMeetingPath(`https://evil.test/meet/${id}/${key}/`)).toBeNull(); expect(bankMeetingPath(`https://bankeiz.com/meet/${id}/${key}/?owner=else`)).toBeNull(); });
    it('admits only the exact meeting transport and methods', () => { const path = `https://receiz.com/api/calendar/meetings/${id}/${key}`; expect(permittedNativeChatPath(new URL(path), 'POST')).toBe(true); expect(permittedNativeChatPath(new URL(path), 'GET')).toBe(true); expect(permittedNativeChatPath(new URL(path + '?owner=else'), 'POST')).toBe(false); expect(permittedNativeChatPath(new URL(path), 'DELETE')).toBe(false); });
});
