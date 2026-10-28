import { useEffect, useRef } from 'react';
interface Recognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: ((event: {
        resultIndex: number;
        results: ArrayLike<{
            isFinal: boolean;
            0: {
                transcript: string;
                confidence: number;
            };
        }>;
    }) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: {
        error: string;
    }) => void) | null;
}
/** Each consenting participant contributes only their own microphone captions.
 * Browser recognition is interpretation; the recorded audio remains source. */
export function useMeetingCaptions(input: {
    enabled: boolean;
    microphone: boolean;
    callId: string;
    conversationId: string;
    request: (path: string, init?: RequestInit) => Promise<Response>;
    onFailure(message: string): void;
}) {
    const current = useRef(input);
    current.current = input;
    useEffect(() => {
        if (!input.enabled || !input.microphone || !input.callId)
            return;
        const browser = window as unknown as {
            SpeechRecognition?: new () => Recognition;
            webkitSpeechRecognition?: new () => Recognition;
        }, Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
        if (!Constructor) {
            current.current.onFailure('Automatic captions are unavailable in this browser. Chat and captured audio remain available.');
            return;
        }
        const recognition = new Constructor();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = navigator.language;
        let stopped = false, restart: ReturnType<typeof setTimeout> | undefined;
        recognition.onresult = event => { for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (!result.isFinal || !result[0].transcript.trim())
                continue;
            void current.current.request(`/api/chat/conversations/${input.conversationId}/calls/${input.callId}/transcript`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: result[0].transcript, source: 'captions', confidence: result[0].confidence, language: recognition.lang, metadata: { recognition: 'browser', authority: 'generated-captions' } }) }).then(response => { if (!response.ok)
                throw Error('Caption delivery could not be confirmed.'); }).catch(() => current.current.onFailure('A caption could not be delivered. The audio recording remains the source.'));
        } };
        recognition.onend = () => { if (!stopped)
            restart = setTimeout(() => { try {
                recognition.start();
            }
            catch { /* Browser may stop recognition independently. */ } }, 600); };
        recognition.onerror = event => { if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
            stopped = true;
            current.current.onFailure('Automatic captions need browser permission. Your call continues.');
        } };
        try {
            recognition.start();
        }
        catch {
            current.current.onFailure('Automatic captions are unavailable. Your call continues.');
        }
        return () => { stopped = true; if (restart)
            clearTimeout(restart); recognition.onend = null; recognition.onresult = null; recognition.onerror = null; recognition.stop(); };
    }, [input.enabled, input.microphone, input.callId, input.conversationId]);
}
