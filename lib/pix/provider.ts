// Adaptado do contrato de integração auditado da Descont' Saúde.
// Exclusivo do servidor: não importar em componentes client.
type Data = Record<string, unknown>;
export type VerifiedPix = {transactionId:string;referenceId:string;status:string;amountCents:number;code:string|null;expiresAt:string|null};
export type PixIdentity = {referenceId:string;amountCents:number;transactionId?:string|null};
const record=(value:unknown):Data|null=>value && typeof value==='object' && !Array.isArray(value)?value as Data:null;
const string=(value:unknown):string|null=>typeof value==='string' && value.length>0?value:null;
export const PIX_GATEWAY_TIMEOUT_MS=45_000;
export const ID_PATTERN=/^[A-Za-z0-9_-]{6,128}$/;
export function sandboxConfigured():boolean{
 return process.env.PAGGPAY_MODE==='sandbox' && !!process.env.PAGGPAY_API_KEY &&
 !!process.env.PAGGPAY_WEBHOOK_SECRET && !!process.env.PAGGPAY_WEBHOOK_URL &&
 !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
export class GatewayError extends Error{
 public httpStatus:number;
 constructor(httpStatus:number,message='Falha temporária ao consultar a PaggPay'){
  super(message);this.httpStatus=httpStatus;
 }
}
function centsFromBRL(amount:unknown):number{
 if(typeof amount!=='string'||!/^\d+(\.\d{1,2})?$/.test(amount))throw new Error('Formato monetário não verificável');
 const [whole,fraction='']=amount.split('.');
 const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents<=0)throw new Error('Valor monetário fora do limite');
 return cents;
}
export function readPaggpayPix(payload:unknown, expected:PixIdentity):VerifiedPix{
 const outer=record(payload);
 const wrapped=record(outer?.data);
 const data=wrapped||outer;
 if(!data)throw new Error('Resposta PaggPay inválida');
 const transaction=record(data.transaction);
 const rawPix=record(data.pix);
 let id:string|null;
 let reference:string|null;
 let status:string|null;
 let currency:string|null;
 let value:unknown;
 let code:unknown;
 let expires:unknown;
 if(transaction){
  id=string(transaction.id);reference=string(transaction.reference_id);
  status=string(transaction.status);currency=string(transaction.currency_code);
  value=rawPix?.value;code=rawPix?.code;expires=rawPix?.expiration_date;
 }else{
  // Fallback documentado pelo projeto de origem: GET /transactions/{id}
  if(data.payment_method_type!=='pix'||!rawPix)throw new Error('Não é uma transação Pix');
  id=string(data.id);reference=string(rawPix.reference_id);
  status=string(data.status);currency=string(data.currency_code);
  value=centsFromBRL(data.amount);code=rawPix.code;expires=rawPix.expiration_date;
 }
 if(!id||!ID_PATTERN.test(id)||reference!==expected.referenceId||currency!=='BRL'){
  throw new Error('Moeda, referência ou identificação PaggPay divergentes');
 }
 if(expected.transactionId && id!==expected.transactionId)throw new Error('Transação diferente da vinculada ao pedido');
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value!==expected.amountCents||value<=0){
  throw new Error('Valor da cobrança divergente');
 }
 const emv=typeof code==='string'&&code.trim() && code.length<=4096?code:null;
 return {transactionId:id,referenceId:reference,status:status||'unknown',
  amountCents:value,code:emv,expiresAt:typeof expires==='string'&&Number.isFinite(Date.parse(expires))?expires:null};
}
export function paymentConfirmed(pix:VerifiedPix):boolean{return pix.status==='succeeded';}
export async function paggpayFetch(path:string,body?:Data,timeoutMs=15_000):Promise<unknown>{
 if(!sandboxConfigured())throw new GatewayError(503,'Pix sandbox desativado');
 if(!/^\/(?:pix|transactions)(?:\/[A-Za-z0-9_%.-]+)?$/.test(path))throw new Error('Rota PaggPay não autorizada');
 const headers:Record<string,string>={Authorization:'Bearer '+process.env.PAGGPAY_API_KEY,
  'Content-Type':'application/json',Accept:'application/json'};
 if(body)headers['X-Paggpay-Webhook-Secret']=process.env.PAGGPAY_WEBHOOK_SECRET!;
 let response:Response;
 try {
  response=await fetch('https://sandbox-api.paggpay.com/v1'+path,{
   method:body?'POST':'GET',headers,cache:'no-store',
   ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeoutMs),
  });
 }catch{throw new GatewayError(504,'Tempo limite ou erro de rede da PaggPay. Não gere nova cobrança.');}
 if(!response.ok)throw new GatewayError(response.status,'Resposta de erro do provedor PaggPay');
 try{return await response.json();}catch{throw new GatewayError(502,'Resposta JSON desconhecida da PaggPay');}
}
export async function getPaggpayPix(id:string):Promise<unknown>{
 if(!ID_PATTERN.test(id))throw new Error('ID PaggPay inválido');
 const start=Date.now();
 try {return await paggpayFetch('/pix/'+encodeURIComponent(id),undefined,15_000);}
 catch(error){
  if(!(error instanceof GatewayError)||error.httpStatus!==404)throw error;
  const left=Math.max(1,15_000-(Date.now()-start));
  return await paggpayFetch('/transactions/'+encodeURIComponent(id),undefined,left);
 }
}
