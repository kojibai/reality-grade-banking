import {expect,it} from 'vitest';
import {parseQuantity,parsePrice,validateOffering,freezeLine,calculateCart,type CounterOffering} from '../src/receiz/counter/domain';
const item:CounterOffering={id:'coffee',name:'Coffee',category:'Drinks',kind:'item',unit:'each',favorite:false,archived:false,variants:[{id:'regular',name:'Regular',priceUsdCents:'450',sku:'001',barcode:'000123',stockMicros:'8000000',lowStockMicros:'2000000'}],modifiers:[{id:'milk',name:'Milk',required:true,max:1,options:[{id:'oat',name:'Oat',priceUsdCents:'75'},{id:'dairy',name:'Dairy',priceUsdCents:'0'}]}]};
it('preserves exact decimal quantities and prices without floating-point cents',()=>{
 expect(parsePrice('$1,234.56')).toBe('123456');expect(parseQuantity('0.125')).toBe('125000');expect(parseQuantity('1000000.000001')).toBe('1000000000001');
 for(const bad of ['1.001','-1','1e3','NaN'])expect(()=>parsePrice(bad)).toThrow();for(const bad of ['0','-1','0.0000001','1e3'])expect(()=>parseQuantity(bad)).toThrow();
});
it('freezes exact selected variant/modifier rights and refuses ambiguous or missing selections',()=>{
 const line=freezeLine(item,'regular','2000000',['oat'],'line-1');expect(line).toMatchObject({itemId:'coffee',variantId:'regular',name:'Coffee',variantName:'Regular',unitPriceUsdCents:'525',quantityMicros:'2000000',modifiers:[{id:'oat',name:'Oat',priceUsdCents:'75'}]});
 item.variants[0].priceUsdCents='999';expect(line.unitPriceUsdCents).toBe('525');item.variants[0].priceUsdCents='450';
 expect(()=>freezeLine(item,'regular','1000000',[],'x')).toThrow();expect(()=>freezeLine(item,'regular','1000000',['oat','dairy'],'x')).toThrow();expect(()=>freezeLine(item,'missing','1000000',['oat'],'x')).toThrow();
});
it('calculates discount, tax and tip from the frozen sale once with explicit cent rounding',()=>{
 const line=freezeLine(item,'regular','2000000',['oat'],'line-1');
 expect(calculateCart({lines:[line],discount:{kind:'percent',value:'1000'},taxRateBps:'825',taxIncluded:false,tipUsdCents:'200'})).toEqual({subtotalUsdCents:'1050',discountUsdCents:'105',taxableUsdCents:'945',taxUsdCents:'78',tipUsdCents:'200',totalUsdCents:'1223'});
 expect(calculateCart({lines:[{...line,unitPriceUsdCents:'100',quantityMicros:'125000'}],discount:{kind:'amount',value:'0'},taxRateBps:'0',taxIncluded:false,tipUsdCents:'0'}).totalUsdCents).toBe('13');
 expect(calculateCart({lines:[{...line,unitPriceUsdCents:'1100',quantityMicros:'1000000'}],discount:{kind:'amount',value:'0'},taxRateBps:'1000',taxIncluded:true,tipUsdCents:'0'})).toMatchObject({taxUsdCents:'100',totalUsdCents:'1100'});
 expect(()=>calculateCart({lines:[line],discount:{kind:'amount',value:'1051'},taxRateBps:'0',taxIncluded:false,tipUsdCents:'0'})).toThrow();
});
it('requires distinct stock identities and valid bounded item fields',()=>{
 expect(validateOffering(item)).toEqual(item);expect(()=>validateOffering({...item,variants:[...item.variants,{...item.variants[0]}]})).toThrow();
 expect(()=>validateOffering({...item,name:''})).toThrow();expect(()=>freezeLine({...item,archived:true},'regular','1000000',['oat'],'x')).toThrow();
});
it('carries complete product information into a frozen line and applies product tax settings exactly',()=>{
 const extended:CounterOffering={...item,modifiers:[],details:{description:'Freshly roasted',receiptName:'House coffee',brand:'Sunday',supplier:'Roaster',categories:['Drinks','Coffee / Hot'],tags:['vegan'],images:[],internalNotes:'Keep dry',customerNote:'Enjoy warm',taxable:false,customFields:[{id:'origin',name:'Origin',value:'Colombia'}]},variants:[{...item.variants[0],costUsdCents:'200',compareAtUsdCents:'550'}]};
 expect(validateOffering(extended).details?.customFields[0].value).toBe('Colombia');const line=freezeLine(extended,'regular','1000000',[],'frozen');expect(line).toMatchObject({name:'House coffee',taxable:false,customerNote:'Enjoy warm'});expect(line).not.toHaveProperty('internalNotes');
 expect(calculateCart({lines:[line],discount:{kind:'amount',value:'0'},taxRateBps:'1000',taxIncluded:false,tipUsdCents:'0'}).taxUsdCents).toBe('0');
 const taxable={...line,id:'tax',taxable:true,taxRateBps:'500'};expect(calculateCart({lines:[line,taxable],discount:{kind:'amount',value:'0'},taxRateBps:'1000',taxIncluded:false,tipUsdCents:'0'})).toMatchObject({subtotalUsdCents:'900',taxUsdCents:'23',totalUsdCents:'923'});
});
