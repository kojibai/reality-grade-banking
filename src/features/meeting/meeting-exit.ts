/** Departure stops local RTC tracks immediately. Recording finalization and
 * remote acknowledgments cannot keep a person's microphone or camera open. */
export async function exitMeeting(input: {
    stopCapture(): Promise<void>;
    depart(): Promise<void>;
}) { const capture = input.stopCapture(), departure = input.depart(); const results = await Promise.allSettled([capture, departure]); return results.flatMap(result => result.status === 'rejected' ? [result.reason] : []); }
