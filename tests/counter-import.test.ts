import {expect,it} from 'vitest';
import {parseDelimited,tableFromJson,previewCounterImport,applyCounterImport,catalogCsv,detectCounterColumns} from '../src/receiz/counter/import';
import type {CounterOffering} from '../src/receiz/counter/domain';
const catalog:CounterOffering[]=[{id:'coffee',name:'Coffee',category:'Drinks',unit:'each',kind:'item',favorite:true,archived:false,modifiers:[],variants:[{id:'regular',name:'Regular',priceUsdCents:'450',sku:'001',barcode:'000123',stockMicros:'8000000',lowStockMicros:'2000000'}]}];
it('reads quoted multiline exports and leading zero identifiers without interpreting spreadsheet formulas',()=>{
 const table=parseDelimited('\uFEFFItem name,SKU,Price,Quantity,Category\r\n"Coffee, iced",0002,4.50,,Drinks\r\n"Two\nlines",0003,3.25,0,Food\r\n');expect(table.rows).toEqual([['Coffee, iced','0002','4.50','','Drinks'],['Two\nlines','0003','3.25','0','Food']]);
 expect(()=>parseDelimited('Name,Price\n"Unclosed,4.50')).toThrow();
 expect(tableFromJson('[{"Name":"Coffee","SKU":"001","Price":"4.50"}]').rows[0]).toEqual(['Coffee','001','4.50']);
});
it('matches stable SKU, preserves blank stock and metadata, and reports invalid new prices',()=>{
 const table=parseDelimited('Item name,SKU,Price,Quantity,Category\nCoffee,001,5.00,,\nTea,002,3.75,12,Drinks\nMissing,003,,,Food');
 const plan=previewCounterImport(table,detectCounterColumns(table.headers),catalog);expect(plan.errors).toMatchObject([{row:4}]);expect(plan.created).toBe(1);expect(plan.updated).toBe(1);
 const next=applyCounterImport(catalog,plan);expect(next).toHaveLength(2);expect(next[0]).toMatchObject({id:'coffee',category:'Drinks',favorite:true});expect(next[0].variants[0]).toMatchObject({priceUsdCents:'500',stockMicros:'8000000',barcode:'000123'});expect(next[1].variants[0]).toMatchObject({sku:'002',stockMicros:'12000000'});expect(catalog[0].variants[0].priceUsdCents).toBe('450');
});
it('groups variant rows, rejects repeated or conflicting identifiers, and protects a stale preview',()=>{
 const table=parseDelimited('Item name,Variation name,SKU,Price,Quantity\nTee,Small,TEE-S,20,5\nTee,Large,TEE-L,22,7\nDuplicate,Regular,TEE-S,30,1');const plan=previewCounterImport(table,detectCounterColumns(table.headers),catalog);expect(plan.created).toBe(2);expect(plan.errors).toMatchObject([{row:4}]);const next=applyCounterImport(catalog,plan);expect(next).toHaveLength(2);expect(next[1].variants).toHaveLength(2);
 expect(()=>applyCounterImport([{...catalog[0],category:'Changed'}],plan)).toThrow('changed');
 const conflict=parseDelimited('Item name,SKU,Barcode,Price\nWrong,NEW,000123,5');expect(previewCounterImport(conflict,detectCounterColumns(conflict.headers),catalog).errors).toHaveLength(1);
});
it('round trips the catalog and neutralizes spreadsheet formula exports',()=>{
 const dangerous=[{...catalog[0],name:'=HYPERLINK("https://example.com")'}];expect(catalogCsv(dangerous)).toContain("'=HYPERLINK");const table=parseDelimited(catalogCsv(catalog));const plan=previewCounterImport(table,detectCounterColumns(table.headers),[]);expect(plan.errors).toEqual([]);const restored=applyCounterImport([],plan);expect(restored[0].variants[0]).toMatchObject({sku:'001',barcode:'000123',priceUsdCents:'450',stockMicros:'8000000'});
});
it('imports complete product JSON and common rich CSV fields without dropping variants, costs or custom details',()=>{
 const rich:CounterOffering={...catalog[0],details:{description:'Small-batch roast',brand:'Sunday',categories:['Coffee / Hot'],taxable:false,customFields:[{id:'origin',name:'Origin',value:'Colombia'}]},variants:[{...catalog[0].variants[0],costUsdCents:'200',compareAtUsdCents:'600'},{...catalog[0].variants[0],id:'large',name:'Large',sku:'002',barcode:'000124',priceUsdCents:'550'}],modifiers:[{id:'milk',name:'Milk',required:false,max:1,options:[{id:'oat',name:'Oat',priceUsdCents:'75'}]}]};
 const table=tableFromJson(JSON.stringify({items:[rich]})),plan=previewCounterImport(table,detectCounterColumns(table.headers),[]);expect(plan.errors).toEqual([]);const result=applyCounterImport([],plan)[0];expect(result.details).toEqual(rich.details);expect(result.modifiers).toEqual(rich.modifiers);expect(result.variants.map(v=>v.sku)).toEqual(['001','002']);expect(result.variants[0].costUsdCents).toBe('200');
 const csv=parseDelimited('Item name,SKU,Price,Description,Brand,Unit cost,Taxable,Tags\nTea,TEA,5,Fine tea,House,2.10,no,"organic,green"');const imported=applyCounterImport([],previewCounterImport(csv,detectCounterColumns(csv.headers),[]))[0];expect(imported).toMatchObject({details:{description:'Fine tea',brand:'House',taxable:false,tags:['organic','green']},variants:[{costUsdCents:'210'}]});
});
