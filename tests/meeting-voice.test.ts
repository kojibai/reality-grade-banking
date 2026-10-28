import{it,expect,vi}from'vitest';import{resumeMeetingVoice}from'../src/features/meeting/MeetingVoice';
it('requires a running audio graph even when resume resolves',async()=>{const resume=vi.fn(async()=>{});await expect(resumeMeetingVoice({resume,state:'suspended'})).rejects.toThrow('tap to enable');await expect(resumeMeetingVoice({resume,state:'running'})).resolves.toBeUndefined();});

it('offers the audio gesture before a suspended resume promise settles',async()=>{let finish!:()=>void;const context={state:'suspended',resume:vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}))};const blocked=vi.fn();const pending=resumeMeetingVoice(context as Pick<AudioContext,'resume'|'state'>,blocked);expect(blocked).toHaveBeenCalledOnce();context.state='running';finish();await pending;});
