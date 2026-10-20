import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {MAX_PIX_WEBHOOK_BYTES,parsePaggpayEvent,verifyPaggpaySignature} from '@/lib/pix/webhook';
import {reconcileWithPaggpay,orderFields,type StoredPixOrder} from '@/lib/pix/reconcile';
import {paymentConfigured} from '@/lib/pix/provider';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(message:string,status:number)=>NextResponse.json({message},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 if(!paymentConfigured())return reply('Unavailable',503);
 const claimedSize=Number(req.headers.get('content-length'));
 if(Number.isFinite(claimedSize)&&claimedSize>MAX_PIX_WEBHOOK_BYTES)return reply('Payload too large',413);
 const raw=await req.text();
 if(Buffer.byteLength(raw,'utf8')>MAX_PIX_WEBHOOK_BYTES)return reply('Payload too large',413);
 if(!verifyPaggpaySignature(raw,req.headers.get('x-paggpay-webhook-signature'),process.env.PAGGPAY_WEBHOOK_SECRET))return reply('Unauthorized',401);
 const evt=parsePaggpayEvent(raw);
 if(evt.kind==='ignored')return reply('Ignored',200);
 if(evt.kind==='foreign')return reply('Other integration; ignored',200);
 if(evt.kind==='invalid')return reply('Signed payload not recognized',503);
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.from('aeromind_payment_orders').select(orderFields).eq('reference_id',evt.referenceId).maybeSingle();
 if(error)return reply('Database unavailable',503);
 if(!data)return reply('Unknown reference',503);
 const order=data as StoredPixOrder;
 if(order.amount_cents!==evt.amountCents||order.provider_transaction_id&&order.provider_transaction_id!==evt.transactionId){
  return reply('Webhook details disagree with order',409);
 }
 try{
  // A assinatura autentica o remetente, mas só o GET ao provedor prova
  // o estado succeeded, a moeda BRL, o valor, a referência e o ID.
  const remote=await reconcileWithPaggpay(admin,order,evt.transactionId,evt.eventId);
  if(remote.status!=='succeeded')return reply('Awaiting settlement',503);
  return reply('Received',200);
 }catch{return reply('Verification failed; retry later',503);}
}
