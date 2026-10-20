import {NextResponse} from 'next/server';
import {createClient as userClient} from '@/lib/supabase/server';
import {createClient as serviceClient} from '@supabase/supabase-js';
import {paggpayFetch,readPaggpayPix,paymentConfigured,paymentEnvironment} from '@/lib/pix/provider';
import {reconcileWithPaggpay,orderFields,type StoredPixOrder} from '@/lib/pix/reconcile';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(obj:Record<string,unknown>,status=200)=>NextResponse.json(obj,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error:string,status:number)=>respond({error},status);
const VALID_PLAN=/^(basico|pro|ultra)-(mensal|trimestral|semestral|anual)$/;
type Payload={plan?:unknown;payerName?:unknown;document?:unknown;coupon?:unknown};
export async function POST(req:Request){
 if(!paymentConfigured())return fail('Pagamento Pix indisponível.',503);
 try{
  const sb=await userClient(),{data:{user}}=await sb.auth.getUser();
  if(!user)return fail('Entre na sua conta.',401);
  if(paymentEnvironment()==='sandbox'){
   const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
   if(!staff)return fail('Sandbox reservado à equipe.',403);
  }
  const input=await req.json() as Payload;
  const slug=typeof input.plan==='string'?input.plan:'';
  const name=typeof input.payerName==='string'?input.payerName.trim():'';
  const document=typeof input.document==='string'?input.document.replace(/\D/g,''):'';
  const coupon=typeof input.coupon==='string'?input.coupon.trim().toUpperCase():'';
  if(!VALID_PLAN.test(slug)||name.length<3||name.length>120||![11,14].includes(document.length)||
    coupon&&!/^[A-Z0-9_-]{4,24}$/.test(coupon))return fail('Dados da cobrança inválidos.',400);
  const {data:reservation,error:reserveError}=await sb.rpc('aeromind_create_pix_order',{p_slug:slug});
  if(reserveError||!reservation)return fail('Não foi possível reservar pedido. Verifique se existe outro Pix aberto.',409);
  const orderId=String(reservation.order_id);
  const admin=serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,
   {auth:{persistSession:false,autoRefreshToken:false}});
  const {data:before,error:readError}=await admin.from('aeromind_payment_orders')
   .select(orderFields).eq('id',orderId).eq('user_id',user.id).single();
  if(readError||!before)return fail('Não foi possível recuperar o pedido.',503);
  let order=before as StoredPixOrder;
  // Um cupom só pode alterar o preço enquanto o POST Pix não começou.
  if(coupon){
   const {data:couponRow,error:couponError}=await admin.from('aeromind_coupon_orders')
    .select('coupon_code').eq('order_id',orderId).maybeSingle();
   if(couponError)return fail('Falha ao consultar cupom.',503);
   if(couponRow && couponRow.coupon_code!==coupon)return fail('Esse pedido já utiliza outro cupom.',409);
   if(!couponRow){
    if(order.pix_requested_at || order.provider_transaction_id || order.status!=='created')
     return fail('A cobrança já foi iniciada; não é possível alterar o cupom.',409);
    const applied=await sb.rpc('aeromind_apply_coupon_to_order',{p_order_id:orderId,p_code:coupon});
    if(applied.error||typeof applied.data!=='number')return fail('Cupom inválido, expirado ou já aplicado.',400);
   }
  }
  const {data:latest,error:latestError}=await admin.from('aeromind_payment_orders')
   .select(orderFields).eq('id',orderId).eq('user_id',user.id).single();
  if(latestError||!latest)return fail('Falha ao consultar pedido reservado.',503);
  order=latest as StoredPixOrder;
  if(order.status==='paid')return respond({orderId,status:'paid',amountCents:order.amount_cents});
  // Se uma transação já existe, nunca solicitar outro POST.
  if(order.provider_transaction_id){
   try{
    const remote=await reconcileWithPaggpay(admin,order,order.provider_transaction_id);
    return respond({environment:paymentEnvironment(),orderId,
     status:remote.status==='succeeded'?'paid':remote.code?'pending':'creating',
     amountCents:order.amount_cents,emv:remote.code,expiresAt:remote.expiresAt});
   }catch{
    return respond({environment:paymentEnvironment(),orderId,status:'creating',
     amountCents:order.amount_cents,requiresSupport:true,
     message:'Não foi possível verificar a transação existente. Nenhum Pix adicional foi gerado.'},202);
   }
  }
  if(order.pix_requested_at){
   return respond({environment:paymentEnvironment(),orderId,status:'creating',amountCents:order.amount_cents,
    requiresSupport:true,message:'Solicitação já iniciada. Aguarde a conciliação, sem gerar nova cobrança.'},202);
  }
  // Reserva atômica: apenas uma requisição simultânea conquista o direito ao POST.
  const {data:claimed,error:claimError}=await admin.from('aeromind_payment_orders')
   .update({pix_requested_at:new Date().toISOString(),last_payment_error:null})
   .eq('id',orderId).eq('user_id',user.id).eq('status','created')
   .is('provider_transaction_id',null).is('pix_requested_at',null)
   .select(orderFields).maybeSingle();
  if(claimError)return fail('Não foi possível reservar a tentativa Pix.',503);
  if(!claimed)return respond({environment:paymentEnvironment(),orderId,status:'creating',
   amountCents:order.amount_cents,message:'Cobrança já está sendo criada em outra solicitação.'},202);
  order=claimed as StoredPixOrder;
  let remotePayload:unknown;
  try{
   remotePayload=await paggpayFetch('/pix',{
    reference_id:order.reference_id,value:order.amount_cents,
    description:'AeroMind '+slug,payer_name:name,payer_email:user.email||undefined,
    payer_document_number:document,payer_pays_fee:false,
    webhook_url:process.env.PAGGPAY_WEBHOOK_URL!,
   },45_000);
  }catch{
   // Timeout é resultado desconhecido. A reserva deve continuar bloqueada.
   await admin.from('aeromind_payment_orders').update({last_payment_error:'Provedor sem resposta; verificar transação antes de nova tentativa'})
    .eq('id',orderId).eq('status','created');
   return respond({environment:paymentEnvironment(),orderId,status:'creating',amountCents:order.amount_cents,
    requiresSupport:true,message:'PaggPay não retornou confirmação. A reserva foi preservada para evitar duplicidade.'},202);
  }
  let verified;
  try{verified=readPaggpayPix(remotePayload,{referenceId:order.reference_id,amountCents:order.amount_cents});}
  catch{
   await admin.from('aeromind_payment_orders').update({last_payment_error:'Contrato de retorno Pix divergente'})
    .eq('id',orderId).eq('status','created');
   return respond({environment:paymentEnvironment(),orderId,status:'creating',requiresSupport:true,
    message:'A resposta do Pix não corresponde ao pedido; nenhuma nova cobrança será criada.'},202);
  }
  if(['failed','expired','canceled'].includes(verified.status))return respond({
   environment:paymentEnvironment(),orderId,status:'creating',requiresSupport:true,
   message:'Cobrança retornou estado terminal. Requer conciliação antes de nova tentativa.'},202);
  const {data:saved,error:saveError}=await admin.from('aeromind_payment_orders').update({
   status:'pending',provider_transaction_id:verified.transactionId,
   pix_code:verified.code,pix_expires_at:verified.expiresAt,last_payment_error:null,
   last_checked_at:new Date().toISOString(),
  }).eq('id',orderId).eq('status','created').is('provider_transaction_id',null)
   .select('id').maybeSingle();
  if(saveError)return fail('Falha na gravação da transação; não gere outro Pix.',503);
  if(!saved){
   const {data:after}=await admin.from('aeromind_payment_orders')
    .select('status,provider_transaction_id').eq('id',orderId).maybeSingle();
   if(after?.status!=='paid'||after.provider_transaction_id!==verified.transactionId)
    return fail('Conciliação pendente; não gere nova cobrança.',503);
  }
  // Uma confirmação da PaggPay pode anteceder o webhook.
  if(verified.status==='succeeded'){
   const {data:toConfirm}=await admin.from('aeromind_payment_orders').select(orderFields).eq('id',orderId).single();
   if(toConfirm)await reconcileWithPaggpay(admin,toConfirm as StoredPixOrder,verified.transactionId);
  }
  return respond({environment:paymentEnvironment(),orderId,status:verified.status==='succeeded'?'paid':verified.code?'pending':'creating',
   amountCents:order.amount_cents,emv:verified.code,expiresAt:verified.expiresAt});
 }catch{return fail('Erro ao preparar a cobrança. Não repita pagamentos sem conferir o pedido.',503);}
}
