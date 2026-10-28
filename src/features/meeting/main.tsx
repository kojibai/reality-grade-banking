import { createRoot } from 'react-dom/client';
import { createMeetingSession } from '../../receiz/meeting-session';
import { meetingCoordinate } from '../../receiz/meeting-links';
import { nativeFetch } from '../../receiz/native-transport';
import { MeetingPage } from './MeetingPage';
import './meeting.css';
const coordinate = meetingCoordinate(location.pathname.endsWith('/') ? location.pathname : location.pathname + '/'), root = createRoot(document.getElementById('root')!);
if (!coordinate)
    root.render(<main className="meeting-lobby"><h1>Check your meeting link.</h1><p>Your host can send you another invitation.</p></main>);
else {
    let entry: Awaited<ReturnType<typeof import('../../checkout/checkout-identity').checkoutIdentitySession>> | null = null;
    const service = createMeetingSession({ ...coordinate, request: (path, init) => nativeFetch('https://receiz.com' + path, init), entry: { async open() { entry ??= await (await import('../../checkout/checkout-identity')).checkoutIdentitySession(); return entry.open(); }, close() { entry?.close(); } } });
    root.render(<MeetingPage service={service}/>);
    window.addEventListener('pagehide', event => { if (!event.persisted)
        void service.close(); });
}
