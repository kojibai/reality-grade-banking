import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {recheckPreparedPublicMaterial} from '../server/prepared-public-material';
import {createPublicMaterialWindowReader} from '../server/public-material-window';
import {fixture} from './fixtures/public-material-parts';
it('rechecks a held part through Source conditional eligibility without receiving or decoding its body',async()=>{
 const generation='a'.repeat(64),fetcher=vi.fn(async(_url:unknown,input?:RequestInit)=>{expect(new Headers(input?.headers).get('if-none-match')).toBe('"'+generation+'"');expect(input?.cache).toBe('no-store');return new Response(null,{status:304});});
 await recheckPreparedPublicMaterial(generation,fetcher);expect(fetcher).toHaveBeenCalledOnce();
});
it('never treats a missing, withdrawn or non-conditional response as public permission',async()=>{
 for(const status of [200,401,403,404,503])await expect(recheckPreparedPublicMaterial('a'.repeat(64),async()=>new Response(null,{status}))).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');
});
it('reuses one parsed immutable body after an eligible conditional check, then refuses a later withdrawal',async()=>{
 const parts=fixture([]),id=parts.put({retained:'accepted display operand'}),read=vi.fn(parts.readPart),check=vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error('PUBLIC_MATERIAL_UNAVAILABLE')),material=JSON.stringify(parts.root),reader=createPublicMaterialWindowReader({material,generation:createHash('sha256').update(material).digest('hex'),readPart:read,recheckPart:check});
 const before=await reader.readPart(id);expect(await reader.readSelectedPart(id)).toBe(before);expect(read).toHaveBeenCalledOnce();expect(check).toHaveBeenCalledWith(id);
 await expect(reader.readSelectedPart(id)).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');expect(read).toHaveBeenCalledOnce();
});
