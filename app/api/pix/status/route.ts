import {NextResponse} from 'next/server';
import {createClient as userClient} from '@/lib/supabase/server';
import {createClient as serviceClient} from '@supabase/supabase-js';
import {paymentConfigured,paymentEnvironment,lookupPaggpayPixByReference} from '@/lib/pix/provider';
import {reconcileWithPaggpay,orderFields,type StoredPixOrder} from '@/lib/pix/reconcile';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const result=(obj:Record<string,unknown>,status=200)=>NextResponse.json(obj,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
 if(!paymentConfigured())return result({error:'Pix indisponível'},503);
 const sb=await userClient(),{data:{user}}=await sb.auth.getUser();
 if(!user)return result({error:'Autenticação necessária'},401);
 if(paymentEnvironment()==='sandbox'){
  const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
  if(!staff)return result({error:'Acesso restrito ao sandbox'},403);
 }
 const id=new URL(req.url).searchParams.get('pedido')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id))return result({error:'Pedido inválido'},400);
 const {data,error}=await sb.from('aeromind_payment_orders').select(orderFields)
  .eq('id',id).eq('user_id',user.id).maybeSingle();
 if(error)return result({error:'Erro ao consultar pedido'},503);
 if(!data)return result({error:'Pedido não localizado'},404);
 let order=data as StoredPixOrder;
 if(order.status==='paid')return result({status:'paid',orderId:id,amountCents:order.amount_cents});
 if(order.provider_transaction_id){
  const admin=serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,
   {auth:{persistSession:false,autoRefreshToken:false}});
  const stale=!order.last_checked_at||Date.now()-Date.parse(order.last_checked_at)>8_000;
  if(stale){
   try{
    const remote=await reconcileWithPaggpay(admin,order,order.provider_transaction_id);
    return result({status:remote.status==='succeeded'?'paid':remote.code?'pending':'creating',
     orderId:id,amountCents:order.amount_cents,emv:remote.code,expiresAt:remote.expiresAt});
   }catch{ /* Falha fechada: nunca sinalizar pago sem comprovação. */ }
  }
  const {data:refreshed}=await sb.from('aeromind_payment_orders').select(orderFields).eq('id',id).eq('user_id',user.id).single();
  if(refreshed)order=refreshed as StoredPixOrder;
  return result({status:order.status,orderId:id,amountCents:order.amount_cents,
   emv:order.pix_code,expiresAt:order.pix_expires_at,requiresSupport:!!order.last_payment_error});
 }
 const age=order.pix_requested_at?Date.now()-Date.parse(order.pix_requested_at):0;
 // Caso o POST anterior tenha falhado apos ser enviado, procurar a mesma
 // referencia na conta da PaggPay, sem gerar outro Pix. Consulta limitada.
 if(order.pix_requested_at && age>20_000){
  const stale=!order.last_checked_at||Date.now()-Date.parse(order.last_checked_at)>60_000;
  if(stale){
   const admin=serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {auth:{persistSession:false,autoRefreshToken:false}});
   const checkBefore=new Date(Date.now()-60_000).toISOString();
   const {data:claim,error:claimError}=await admin.from('aeromind_payment_orders')
    .update({last_checked_at:new Date().toISOString()})
    .eq('id',id).eq('user_id',user.id).eq('status','created')
    .is('provider_transaction_id',null)
    .or('last_checked_at.is.null,last_checked_at.lt.'+checkBefore)
    .select('id').maybeSingle();
   if(!claimError&&claim){
    try{
     const remoteId=await lookupPaggpayPixByReference(order.reference_id);
     if(remoteId){
      const remote=await reconcileWithPaggpay(admin,order,remoteId);
      return result({status:remote.status==='succeeded'?'paid':'pending',
       orderId:id,amountCents:order.amount_cents,emv:remote.code,expiresAt:remote.expiresAt,
       message:remote.code?'Transação anterior recuperada na PaggPay. Não gere outra cobrança.':
        'Transação localizada na PaggPay, mas código Pix ainda indisponível.'});
     }
    }catch{/* A lista pode falhar, ou a chave não ter permissão. Pedido permanece bloqueado. */}
   }
  }
 }
 return result({orderId:id,status:'creating',amountCents:order.amount_cents,
  requiresSupport:!!order.last_payment_error||age>60_000,
  message:order.last_payment_error?order.last_payment_error+
   '. Verificaremos se existe uma transação anterior. Não gere novo Pix.':
   age>60_000?'Ainda não há ID de transação confirmado. Não crie outro pedido até conciliá-lo.':null});
}
