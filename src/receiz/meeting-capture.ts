export interface MeetingArchive {
    read(id: string): Promise<unknown>;
    write(id: string, value: unknown, expected: unknown): Promise<void>;
    retain(bytes: Uint8Array): Promise<string>;
    restore(digest: string): Promise<Uint8Array>;
    seal(bytes: Uint8Array, filename: string): Promise<File>;
}
export interface CaptureRun {
    id: string;
    startedAt: string;
    endedAt: string | null;
    mimeType: string;
    chunks: {
        digest: string;
        size: number;
    }[];
}
export interface MeetingCaptureState {
    schema: 'bankeiz.meeting.capture.v1';
    eventId: string;
    runs: CaptureRun[];
    proofs?:{filename:string;mimeType:string;createdAt:string;call?:{id:string;status:string};parts:{digest:string;size:number}[]}[];
}
export function createMeetingCapture(eventId: string, archive: MeetingArchive) {
    let held: MeetingCaptureState | null = null, queue = Promise.resolve(), active: string | null = null,finishing:{runId:string;endedAt:string}|null=null;
    let pendingProof:{file:File;createdAt:string;call?:{id:string;status:string};parts:{digest:string;size:number}[]}|null=null;
    const pending: {
        runId: string;
        blob: Blob;
        chunks: CaptureRun['chunks'] | null;
    }[] = [];
    const read = async () => { if (held)
        return held; const raw = await archive.read(eventId); if (raw !== null && raw !== undefined) {
        const source = raw as MeetingCaptureState;
        if (source.schema !== 'bankeiz.meeting.capture.v1' || source.eventId !== eventId || !Array.isArray(source.runs))
            throw Error('MEETING_CAPTURE_SOURCE_INVALID');
        held = source;
    } return held; };
    async function save(next: MeetingCaptureState) { try {
        await archive.write(eventId, next, held);
    }
    catch (error) {
        const accepted = await archive.read(eventId).catch(() => null);
        if (JSON.stringify(accepted) !== JSON.stringify(next))
            throw error;
    } held = next; }
    async function drain() { while (pending.length) {
        const item = pending[0];
        if (!item.chunks) {
            const chunks: CaptureRun['chunks'] = [];
            for (let offset = 0; offset < item.blob.size; offset += 8 * 1024 * 1024) {
                const bytes = new Uint8Array(await item.blob.slice(offset, offset + 8 * 1024 * 1024).arrayBuffer());
                chunks.push({ digest: await archive.retain(bytes), size: bytes.length });
            }
            item.chunks = chunks;
        }
        const current = held!;
        await save({ ...current, runs: current.runs.map(run => run.id === item.runId ? { ...run, chunks: [...run.chunks, ...item.chunks!] } : run) });
        pending.shift();
    } }
    const flush = () => { const task = queue.catch(() => { }).then(drain); queue = task; return task; };
    async function settle(){await flush();if(finishing){const ending=finishing;await save({...held!,runs:held!.runs.map(run=>run.id===ending.runId?{...run,endedAt:ending.endedAt}:run)});finishing=null;}}
    async function retainProof(){
      const pending=pendingProof!;let offset=pending.parts.reduce((sum,part)=>sum+part.size,0);
      for(;offset<pending.file.size;offset+=8*1024*1024){const bytes=new Uint8Array(await pending.file.slice(offset,offset+8*1024*1024).arrayBuffer());pending.parts.push({digest:await archive.retain(bytes),size:bytes.length});}
      await save({...held!,proofs:[...(held!.proofs??[]),{filename:pending.file.name,mimeType:pending.file.type,createdAt:pending.createdAt,...(pending.call?{call:pending.call}:{}),parts:pending.parts}]});pendingProof=null;return pending.file;
    }
    return { known: () => held, read,
        async begin(mimeType: string) { await settle(); await read(); if (active)
            throw Error('MEETING_CAPTURE_ALREADY_ACTIVE'); const run = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), endedAt: null, mimeType, chunks: [] }; await save({ ...held,schema: 'bankeiz.meeting.capture.v1', eventId, runs: [...(held?.runs ?? []), run] }); active = run.id; },
        append(blob: Blob) { const runId = active; if (!runId)
            return Promise.reject(Error('MEETING_CAPTURE_NOT_ACTIVE')); pending.push({ runId, blob, chunks: null }); return flush(); },
        async finish(){if(active){finishing={runId:active,endedAt:new Date().toISOString()};active=null;}await settle();},
        async latestProof(){await read();const proof=held?.proofs?.at(-1);if(!proof)return null;const parts:Uint8Array<ArrayBuffer>[]=[];for(const part of proof.parts){const bytes=await archive.restore(part.digest);if(bytes.length!==part.size)throw Error('MEETING_RECORD_SOURCE_MISMATCH');parts.push(new Uint8Array(bytes));}return new File(parts,proof.filename,{type:proof.mimeType});},
        async seal(evidence: unknown, interpretations: unknown[]) {
            await settle();
            await read();
            if (active)
                throw Error('MEETING_CAPTURE_STILL_ACTIVE');
            if (!held)
                await save({ schema: 'bankeiz.meeting.capture.v1', eventId, runs: [] });
            if(pendingProof)return retainProof();
            const files: Record<string, Uint8Array> = { 'meeting.json': new TextEncoder().encode(JSON.stringify({ schema: 'bankeiz.meeting.record.v1', capture: {schema:held!.schema,eventId:held!.eventId,runs:held!.runs}, incompleteCaptureRuns: held!.runs.filter(run => !run.endedAt).map(run => run.id), evidence, interpretations, scope: 'The actual captured intervals and source records. Uncaptured time and disconnected media are not represented as recorded.', sealedAt: new Date().toISOString() }, null, 2)) };
            for (const [index, run] of held!.runs.entries()) {
                const parts: Uint8Array<ArrayBuffer>[] = [];
                for (const part of run.chunks) {
                    const bytes = await archive.restore(part.digest);
                    if (bytes.length !== part.size)
                        throw Error('MEETING_CAPTURE_SOURCE_MISMATCH');
                    parts.push(new Uint8Array(bytes));
                }
                files[`recording-${index + 1}.${run.mimeType.includes('mp4') ? 'mp4' : 'webm'}`] = new Uint8Array(await new Blob(parts).arrayBuffer());
            }
            const { zip } = await import('fflate'), bytes = await new Promise<Uint8Array>((resolve, reject) => zip(files, { level: 0 }, (error, value) => error ? reject(error) : resolve(value)));
            const sourceCall=(evidence as {artifact?:{call?:{id?:unknown;status?:unknown}}})?.artifact?.call;
            pendingProof={file:await archive.seal(bytes, 'meeting-record.zip'),createdAt:new Date().toISOString(),parts:[],...(typeof sourceCall?.id==='string'&&typeof sourceCall.status==='string'?{call:{id:sourceCall.id,status:sourceCall.status}}:{})};
            return retainProof();
        },
    };
}
export type MeetingCapture = ReturnType<typeof createMeetingCapture>;
