import {expect,it} from 'vitest';import {assetReturnDestination} from '../src/core/asset-return';
it.each(['/feed','/feed/'])('returns to %s with the correct Feed label',path=>{expect(assetReturnDestination({assetReturnPath:path})).toEqual({path,label:'Feed'});});
