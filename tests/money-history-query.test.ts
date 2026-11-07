import {expect,it} from 'vitest';
import {readMoneyHistoryQuery} from '../src/receiz/money-history-query';

it('uses the same default history query for omitted and null optional filters',()=>{
 expect(readMoneyHistoryQuery({query:null,from:null,to:null,direction:null,offset:null,limit:null} as never)).toEqual({query:'',direction:'all',offset:0,limit:10,from:undefined,to:undefined});
});

it('bounds a larger requested history page without discarding its filters or scan position',()=>{
 expect(readMoneyHistoryQuery({query:'Studio',direction:'out',offset:20,limit:50,from:'2026-11-01T00:00:00Z',to:'2026-11-08T00:00:00.000Z'})).toEqual({query:'Studio',direction:'out',offset:20,limit:20,from:1793491200000,to:1794096000000});
});

it.each([{limit:0},{limit:-1},{limit:1.5},{limit:'20'},{offset:-1},{direction:'debit'},{from:'yesterday'},{from:'2026-11-08T00:00:00Z',to:'2026-11-01T00:00:00Z'},{ownerUid:'foreign'},{approved:true}])('preserves refusal of invalid or authority-bearing query %j',input=>{
 expect(()=>readMoneyHistoryQuery(input as never)).toThrow('MONEY_QUERY_INVALID');
});
