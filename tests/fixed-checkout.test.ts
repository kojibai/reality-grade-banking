import {expect,it} from 'vitest';
import {createFixedSale,readFixedSale,buildFixedSaleUrl,fixedSalePaymentNote,parseFixedSalePaymentNote,type FixedSaleFields} from '../src/receiz/fixed-checkout';
import {parseCheckoutRequest} from '../src/receiz/checkout-request';
import {parsePaymentRequest} from '../src/receiz/payment-request';
import {buildFixedPaymentTools} from '../src/receiz/payment-tools';
import {paymentQr} from '../src/receiz/payment-qr';
import {decodePaymentPixels} from '../src/receiz/payment-decoder';
const fields:FixedSaleFields={schema:'bank.fixed-checkout.v1',saleId:'10000000-0000-4000-8000-000000000001',recipientUserId:'20000000-0000-4000-8000-000000000001',username:'merchant',currency:'usd',amountUsdCents:'1230'};
const nonce='30000000-0000-4000-8000-000000000001';
it('round-trips a fixed sale and keeps its exact request through checkout links and scans',async()=>{
 const sale=await createFixedSale(fields),url=buildFixedSaleUrl(sale);expect(url).toBe('https://bankeiz.com/pay/merchant/?fixed=1&sale='+fields.saleId+'&recipient='+fields.recipientUserId+'&amount=12.30');
 expect(await readFixedSale(sale)).toEqual(sale);expect(parseCheckoutRequest(url)).toEqual({username:'merchant',amount:'12.30',fixedSale:fields});expect(parsePaymentRequest(url)).toEqual({recipient:'merchant',amount:'12.30',checkoutUrl:url});
 expect(fixedSalePaymentNote(sale,nonce)).toBe('bank.sale.v1:'+sale.digest+':'+nonce);expect(parseFixedSalePaymentNote(fixedSalePaymentNote(sale,nonce))).toEqual({saleDigest:sale.digest,clientNonce:nonce});expect(parseFixedSalePaymentNote('bank.sale.v1:'+sale.digest+':bad')).toBeNull();
 const tools=buildFixedPaymentTools(sale);expect(tools.hostedCheckoutLink).toBe(url);expect(tools.buttonHtml).toContain('&amp;sale=');expect(tools.buttonHtml).not.toContain('privateKey');
});
it('binds every semantic field and refuses changed digest, invalid amounts and unsupported identities',async()=>{
 const sale=await createFixedSale(fields);for(const change of [{saleId:nonce},{recipientUserId:nonce},{username:'another'},{amountUsdCents:'1231'}])expect((await createFixedSale({...fields,...change})).digest).not.toBe(sale.digest);
 await expect(readFixedSale({...sale,amountUsdCents:'1231'})).rejects.toThrow();
 for(const change of [{saleId:'bad'},{recipientUserId:'bad'},{currency:'eur'},{amountUsdCents:'0'},{amountUsdCents:'1e2'},{amountUsdCents:'01'},{amountUsdCents:'1'.repeat(21)},{username:'@merchant'},{username:'a'}])await expect(createFixedSale({...fields,...change} as FixedSaleFields)).rejects.toThrow();
});
it('refuses partial or ambiguous fixed URLs rather than downgrading them to editable payments',async()=>{
 const url=buildFixedSaleUrl(await createFixedSale(fields));for(const invalid of [url.replace('fixed=1&',''),url.replace(/&recipient=[^&]+/,''),url.replace(/&amount=[^&]+/,''),url+'&sale='+fields.saleId,url+'&recipient='+nonce,url+'&fixed=1',url.replace('fixed=1','fixed=2'),url+'&unknown=1']){expect(()=>parseCheckoutRequest(invalid)).toThrow();expect(()=>parsePaymentRequest(invalid)).toThrow();}
 const parts=url.split('&');for(let n=1;n<parts.length;n++){const truncated=parts.slice(0,n).join('&');expect(()=>parseCheckoutRequest(truncated),truncated).toThrow();expect(()=>parsePaymentRequest(truncated)).toThrow();}
 expect(parseCheckoutRequest('https://bankeiz.com/pay/merchant/?amount=12.30')).toEqual({username:'merchant',amount:'12.30'});
});
it('fits the longest accepted fixed link in the existing QR encoder without reducing payment capacity',async()=>{
 const url=buildFixedSaleUrl(await createFixedSale({...fields,username:'x'.repeat(24),amountUsdCents:'9'.repeat(20)}));expect(new TextEncoder().encode(url).length).toBeLessThanOrEqual(230);expect(paymentQr(url)).toHaveLength(53);expect(parseCheckoutRequest(url)?.fixedSale?.amountUsdCents).toBe('9'.repeat(20));
 const matrix=paymentQr(url),size=244,pixels=new Uint8ClampedArray(size*size*4).fill(255);for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(matrix[Math.floor(y/4)-4]?.[Math.floor(x/4)-4]){const i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;}expect(await decodePaymentPixels(pixels,size,size)).toBe(url);
});
