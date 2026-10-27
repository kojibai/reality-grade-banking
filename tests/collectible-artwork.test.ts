import {expect,it} from 'vitest';
import {safeReceizArtworkUrl} from '../src/receiz/public-market';
it('accepts only the existing public native sports artwork paths without opening other API routes',()=>{
 for(const path of ['/api/game/sports/baseball/player-image/694819','/api/game/sports/soccer/player-image/USA/10/christian-pulisic','/api/game/sports/fight/fighter-image/belal-muhammad'])expect(safeReceizArtworkUrl(path)).toBe('https://receiz.com'+path);
 for(const path of ['/api/auth/session','/api/game/sports/baseball/player-image/694819?url=https://evil.test','https://evil.test/api/game/sports/baseball/player-image/694819','/api/game/sports/baseball/player-image/not-an-id','/api/game/sports/baseball/player-image/694819/extra'])expect(safeReceizArtworkUrl(path)).toBeNull();
});
