import {IncomingMessage,ServerResponse} from 'node:http';
import {Duplex} from 'node:stream';
import type {Socket} from 'node:net';
import {expect,it} from 'vitest';
import {nativeAccountMiddleware} from '../server/native-account';
it('preserves each HttpOnly cookie separately through the real Node HTTP adapter and encoder',async()=>{
 const packets:Buffer[]=[],socket=new Duplex({read(){},write(chunk,_encoding,done){packets.push(Buffer.from(chunk));done();}}),request=new IncomingMessage(socket as Socket);
 request.method='GET';request.url='/api/bank/native/email-payment/start?token=synthetic-token&transferId=10000000-0000-4000-8000-000000000004&clientNonce=new-synthetic-nonce';
 const context=Buffer.from(JSON.stringify({transferId:'10000000-0000-4000-8000-000000000009',clientNonce:'old-synthetic-nonce',expiresAt:Date.now()+300000})).toString('base64url');
 request.headers={host:'bankeiz.com',cookie:`__Secure-bankeiz-payment-context=${context}; __Secure-bankeiz-payment-session=e30.e30.signature`};
 const response=new ServerResponse(request);response.assignSocket(socket as Socket);
 try{
  await nativeAccountMiddleware(request,response,()=>{throw Error('Unexpected route fallthrough');});
  const wire=Buffer.concat(packets).toString('utf8'),setCookies=wire.split('\r\n').filter(line=>/^set-cookie:/i.test(line));
  expect(response.statusCode).toBe(303);expect(setCookies).toHaveLength(3);expect(setCookies.every(value=>value.includes('HttpOnly; Secure; SameSite=Strict'))).toBe(true);
 }finally{socket.destroy();request.destroy();response.destroy();}
});
