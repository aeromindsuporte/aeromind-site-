// Adaptado do contrato de integração auditado da Descont' Saúde.
// Exclusivo do servidor: não importar em componentes client.
type Data = Record<string, unknown>;
export type VerifiedPix = {transactionId:string;referenceId:string;status:string;amountCents:number;code:string|null;expiresAt:string|null};
export type PixIdentity = {referenceId:string;amountCents:number;transactionId?:string|null};
const record=(value:unknown):Data|null=>value && typeof value==='object' && !Array.isArray(value)?value as Data:null;
const string=(value:unknown):string|null=>typeof value==='string' && value.length>0?value:null;
export const PIX_GATEWAY_TIMEOUT_MS=45_000;
export const ID_PATTERN=/^[A-Za-z0-9_-]{6,128}$/;
/** Nao enviar uma cobranca AeroMind ao endpoint da Descont' Saude. */
export function isAeromindCallback(raw:string|undefined):boolean {
 if(!raw)return false;
 try {
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)return false;
  if(url.pathname!=='/api/pix/webhook')return false;
  return url.hostname==='aeromind-site.vercel.app'
   || /^aeromind-site-[a-z0-9-]+\.vercel\.app$/i.test(url.hostname);
 }catch{return false;}
}

// Uma chave pp_live_ nunca pode ser enviada ao endpoint sandbox.
// Ser compatível com o sandbox não significa credencial válida: isso depende de homologação.
export function isSandboxKeyCompatible(key:string|undefined):boolean{
 return !!key && !key.startsWith('pp_live_');
}
export function sandboxConfigured():boolean{
 return process.env.PAGGPAY_MODE==='sandbox' && isSandboxKeyCompatible(process.env.PAGGPAY_API_KEY) &&
 !!process.env.PAGGPAY_WEBHOOK_SECRET && isAeromindCallback(process.env.PAGGPAY_WEBHOOK_URL) &&
 !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
// O modo live é um controle explícito de servidor: a presença da chave
// sozinha nunca libera clientes ou cobranças.
export function liveConfigured():boolean{
 return process.env.VERCEL_ENV==='production' && process.env.PAGGPAY_MODE==='live'
  && process.env.PAGGPAY_API_KEY?.startsWith('pp_live_')===true
  && !!process.env.PAGGPAY_WEBHOOK_SECRET
  && isAeromindCallback(process.env.PAGGPAY_WEBHOOK_URL)
  && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
export function paymentConfigured():boolean{return liveConfigured()||sandboxConfigured();}
export function paymentEnvironment(): 'live'|'sandbox'|null {
 return liveConfigured()?'live':sandboxConfigured()?'sandbox':null;
}
export function extractMatchingTransactionId(listResponse:unknown,referenceId:string):string|null {
 // Filtragem por referencia exata: a conta pode conter transacoes de outros sites.
 const payload=record(listResponse);
 const collection=Array.isArray(payload?.data)?payload.data:
  Array.isArray(payload?.transactions)?payload.transactions:
  Array.isArray(record(payload?.data)?.data)?record(payload?.data)?.data:null;
 if(!Array.isArray(collection))return null;
 for(const item of collection){
  const row=record(item);
  if(!row)continue;
  const transaction=record(row.transaction);
  const ref=string(row.reference_id)||string(record(row.pix)?.reference_id)||
   string(transaction?.reference_id);
  if(ref!==referenceId)continue;
  const method=row.payment_method_type;
  if(method&&method!=='pix')continue;
  const id=string(row.id)||string(transaction?.id);
  if(id&&ID_PATTERN.test(id))return id;
 }
 return null;
}
export async function lookupPaggpayPixByReference(referenceId:string):Promise<string|null>{
 if(!/^aeromind-[0-9a-f-]{36}$/.test(referenceId))throw new Error('Referencia invalida');
 // Nao solicitar criacao de Pix; no maximo duas paginas recentes da propria conta.
 for(const page of [1,2]){
  const response=await paggpayFetch('/transactions?page='+page+'&per_page=100',undefined,10_000);
  const found=extractMatchingTransactionId(response,referenceId);
  if(found)return found;
 }
 return null;
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
 if(!paymentConfigured())throw new GatewayError(503,'Pix desativado.');
 if(!/^\/(?:pix|transactions)(?:\/[A-Za-z0-9_%.-]+)?$/.test(path)
   && !/^\/transactions\?page=[12]&per_page=100$/.test(path))
  throw new Error('Rota PaggPay não autorizada');
 const headers:Record<string,string>={Authorization:'Bearer '+process.env.PAGGPAY_API_KEY,
  'Content-Type':'application/json',Accept:'application/json'};
 if(body)headers['X-Paggpay-Webhook-Secret']=process.env.PAGGPAY_WEBHOOK_SECRET!;
 let response:Response;
 try {
  response=await fetch((liveConfigured()?'https://api.paggpay.com/v1':'https://sandbox-api.paggpay.com/v1')+path,{
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
