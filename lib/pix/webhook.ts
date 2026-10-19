import {createHmac, timingSafeEqual} from 'node:crypto';

export const MAX_PIX_WEBHOOK_BYTES = 65_536;
const successEvents = new Set(['transaction.succeeded', 'pix.cashin.succeeded']);
export function verifyPaggpaySignature(raw:string,signature:string|null,secret:string|undefined,
 nowSeconds=Math.floor(Date.now()/1000)):boolean{
 if(!secret||!signature||Buffer.byteLength(raw,'utf8')>MAX_PIX_WEBHOOK_BYTES)return false;
 const match=/^t=(\d+),v1=([0-9a-f]{64})$/i.exec(signature);
 if(!match)return false;
 const ts=Number(match[1]);
 if(!Number.isSafeInteger(ts)||Math.abs(nowSeconds-ts)>300)return false;
 const expected=createHmac('sha256',secret).update(match[1]+'.'+raw).digest();
 const received=Buffer.from(match[2],'hex');
 return expected.length===received.length&&timingSafeEqual(expected,received);
}
type PixEvent={kind:'success';eventId:string;referenceId:string;transactionId:string;amountCents:number;currency:string};
type PixIgnored={kind:'ignored'};type PixForeign={kind:'foreign'};type PixInvalid={kind:'invalid'};
export const isAeromindReference=(ref:unknown):ref is string=>typeof ref==='string' &&
 /^aeromind-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref);
export function parsePaggpayEvent(raw:string):PixEvent|PixIgnored|PixForeign|PixInvalid{
 let item:unknown;
 try{item=JSON.parse(raw);}catch{return {kind:'invalid'};}
 if(!item||typeof item!=='object'||Array.isArray(item))return {kind:'invalid'};
 const evt=item as Record<string,unknown>;
 if(typeof evt.id!=='string'||evt.id.length<8||evt.id.length>120)return {kind:'invalid'};
 if(!successEvents.has(String(evt.event||'')))return {kind:'ignored'};
 if(!evt.data||typeof evt.data!=='object'||Array.isArray(evt.data))return {kind:'invalid'};
 const data=evt.data as Record<string,unknown>;
 // A Descont' Saude utiliza referencias UUID simples. Mesmo que os dois
 // negocios partilhem uma conta PaggPay, eventos de outros sistemas nao
 // consultam pedidos nem ativam licencas do AeroMind.
 if(typeof data.reference_id!=='string')return {kind:'invalid'};
 if(!data.reference_id.startsWith('aeromind-'))return {kind:'foreign'};
 if(!isAeromindReference(data.reference_id))return {kind:'invalid'};
 if(typeof data.id!=='string'||!/^[A-Za-z0-9_-]{6,128}$/.test(data.id))return {kind:'invalid'};
 if(data.currency_code!=='BRL')return {kind:'invalid'};
 // Descont' Saúde recebe amount; o campo legado value também pode existir.
 // Quando ambos são enviados, têm de ser idênticos.
 const value=data.amount??data.value;
 if(data.amount!==undefined&&data.value!==undefined&&data.amount!==data.value)return {kind:'invalid'};
 const cents=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):NaN;
 if(!Number.isSafeInteger(cents)||cents<=0)return {kind:'invalid'};
 return {kind:'success',eventId:evt.id,referenceId:data.reference_id,
   transactionId:data.id,amountCents:cents,currency:'BRL'};
}
