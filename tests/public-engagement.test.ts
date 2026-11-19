// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {PublicMarketItem} from '../src/receiz/public-market';

const receizId='1e2a4e1a-1695-4e08-af09-44470b7c8e44';
const item={category:'proof',assetId:receizId,ownerUsername:'cadence',ownerIdentity:{username:'cadence'},sourceUrl:'https://receiz.com/cadence/verified/'+receizId,mediaKind:'audio'} as PublicMarketItem;
const send=vi.fn<typeof fetch>();

beforeEach(()=>{
  vi.resetModules();
  vi.useFakeTimers();
  send.mockReset().mockImplementation(()=>new Promise(()=>{}));
  vi.stubGlobal('fetch',send);
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(()=>{vi.runOnlyPendingTimers();vi.useRealTimers();vi.unstubAllGlobals();});

const events=()=>send.mock.calls.map(([url,options])=>({url,options,body:JSON.parse(String(options?.body))}));

describe('Bankeiz engagement on the Receiz receiver',()=>{
  it('uses the bound public Original and defers an anonymous, deduplicated impression',async()=>{
    const {publicOriginalEngagement,trackPublicEngagement}=await import('../src/receiz/public-engagement');
    expect(publicOriginalEngagement({...item,sourceUrl:item.sourceUrl!.replace('/cadence/','/someone/')})).toBeUndefined();
    const subject=publicOriginalEngagement(item);
    trackPublicEngagement(subject,'original_impression','bankeiz_feed');
    trackPublicEngagement(subject,'original_impression','bankeiz_profile_collection');
    expect(send).not.toHaveBeenCalled();
    vi.runOnlyPendingTimers();
    expect(events()).toMatchObject([{
      url:'https://receiz.com/api/profile/analytics/track',
      options:{method:'POST',mode:'no-cors',keepalive:true,credentials:'omit',referrerPolicy:'no-referrer'},
      body:{username:'cadence',receizId,event:'original_impression',source:'bankeiz_feed'},
    }]);
  });

  it('uses a single playback session, excluding buffering and seekers from witnessed time',async()=>{
    const {observePublicPlayback,publicOriginalEngagement}=await import('../src/receiz/public-engagement');
    const audio=document.createElement('audio');
    const stop=observePublicPlayback(audio,publicOriginalEngagement(item),'bankeiz_feed_audio');
    audio.dispatchEvent(new Event('playing'));
    vi.advanceTimersByTime(1800);
    audio.dispatchEvent(new Event('waiting'));
    vi.advanceTimersByTime(3000);
    audio.dispatchEvent(new Event('playing'));
    vi.advanceTimersByTime(700);
    audio.dispatchEvent(new Event('seeking'));
    vi.advanceTimersByTime(2000);
    audio.dispatchEvent(new Event('playing'));
    vi.advanceTimersByTime(500);
    audio.dispatchEvent(new Event('ended'));
    vi.runOnlyPendingTimers();
    stop?.();
    const recorded=events().map(event=>event.body);
    expect(recorded.map(event=>event.event)).toEqual(['original_stream_play','original_stream_complete']);
    expect(recorded[1].durationSeconds).toBeCloseTo(3);
    expect(recorded[1].meta.playbackSessionId).toBe(recorded[0].meta.playbackSessionId);
  });

  it('counts a native loop completion only when playback reached the end',async()=>{
    const {observePublicPlayback,publicOriginalEngagement}=await import('../src/receiz/public-engagement');
    const video=document.createElement('video');
    video.loop=true;
    let position=0,playedEnd=0;
    Object.defineProperties(video,{
      currentTime:{get:()=>position},duration:{value:2},played:{get:()=>({length:1,end:()=>playedEnd})},
    });
    const stop=observePublicPlayback(video,publicOriginalEngagement({...item,mediaKind:'video'}),'bankeiz_feed_video');
    video.dispatchEvent(new Event('playing'));
    vi.advanceTimersByTime(1750);
    position=playedEnd=1.75;
    video.dispatchEvent(new Event('timeupdate'));
    position=0;
    video.dispatchEvent(new Event('seeking'));
    vi.runOnlyPendingTimers();
    expect(events().map(event=>event.body.event)).toEqual(['original_stream_play']);

    video.dispatchEvent(new Event('playing'));
    vi.advanceTimersByTime(1750);
    position=1.75;playedEnd=2;
    video.dispatchEvent(new Event('timeupdate'));
    position=0;
    video.dispatchEvent(new Event('seeking'));
    vi.runOnlyPendingTimers();
    stop?.();
    expect(events().map(event=>event.body.event)).toEqual(['original_stream_play','original_stream_complete']);
  });

  it('reports the exact imported coordinate and records a page when it was actually read',async()=>{
    const {observePublicEngagement,publicOriginalEngagement}=await import('../src/receiz/public-engagement');
    const imported='imported-'+'a'.repeat(64);
    const subject=publicOriginalEngagement({...item,assetId:imported,sourceUrl:'https://receiz.com/cadence/verified/'+imported});
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
    try {
      const stop=observePublicEngagement(subject,'bankeiz_asset_detail',4);
      vi.advanceTimersByTime(2100);
      stop?.();
      vi.runOnlyPendingTimers();
      expect(events().map(event=>event.body)).toMatchObject([{event:'original_page_read',receizId:imported,meta:{pageNumber:4}}]);
    } finally {
      Reflect.deleteProperty(document,'visibilityState');
    }
  });
});
