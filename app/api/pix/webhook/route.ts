import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {MAX_PIX_WEBHOOK_BYTES,parsePaggpayEvent,verifyPaggpaySignature} from '@/lib/pix/webhook';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(message:string,status:number)=>NextResponse.json({message},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 const secret=process.env.PAGGPAY_WEBHOOK_SECRET;
 if(process.env.PAGGPAY_MODE!=='sandbox'||!secret||!process.env.SUPABASE_SERVICE_ROLE_KEY)return reply('Unavailable',503);
 const claimedSize=Number(req.headers.get('content-length'));
 if(Number.isFinite(claimedSize)&&claimedSize>MAX_PIX_WEBHOOK_BYTES)return reply('Payload too large',413);
 const raw=await req.text();
 if(Buffer.byteLength(raw,'utf8')>MAX_PIX_WEBHOOK_BYTES)return reply('Payload too large',413);
 if(!verifyPaggpaySignature(raw,req.headers.get('x-paggpay-webhook-signature'),secret))return reply('Unauthorized',401);
 const evt=parsePaggpayEvent(raw);
 if(evt.kind==='ignored')return reply('Ignored',200);
 // O provedor não reenvia eventos que recebem HTTP 422. Falhar com 503 permite
 // reenvio e investigação de um contrato assinado ainda desconhecido.
 if(evt.kind==='invalid')return reply('Signed payload not recognized',503);
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:ok,error}=await admin.rpc('aeromind_fulfill_pix',{p_event_id:evt.eventId,p_reference_id:evt.referenceId,p_amount_cents:evt.amountCents,p_provider_transaction_id:evt.transactionId});
 if(error||ok!==true)return reply('Reconciliation failed',503);
 return reply('Received',200);
}
