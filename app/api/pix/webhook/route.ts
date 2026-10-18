import {NextResponse} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(message:string,status:number)=>NextResponse.json({message},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 const secret=process.env.PAGGPAY_WEBHOOK_SECRET;
 if(process.env.PAGGPAY_MODE!=='sandbox'||!secret||!process.env.SUPABASE_SERVICE_ROLE_KEY)return reply('Unavailable',503);
 const match=/^t=(\d+),v1=([a-f0-9]{64})$/i.exec(req.headers.get('x-paggpay-webhook-signature')||'');
 if(!match||Math.abs(Math.floor(Date.now()/1000)-Number(match[1]))>300)return reply('Unauthorized',401);
 const raw=await req.text();if(Buffer.byteLength(raw,'utf8')>65536)return reply('Payload too large',413);
 const expected=createHmac('sha256',secret).update(match[1]+'.'+raw).digest();
 const received=Buffer.from(match[2],'hex');
 if(expected.length!==received.length||!timingSafeEqual(expected,received))return reply('Unauthorized',401);
 let evt:{id?:unknown,event?:unknown,data?:unknown};try{evt=JSON.parse(raw)}catch{return reply('Bad JSON',400)}
 if(typeof evt.id!=='string'||evt.id.length>120)return reply('Missing ID',400);
 if(!['transaction.succeeded','pix.cashin.succeeded'].includes(String(evt.event||'')))return reply('Ignored',200);
 const data=evt.data as Record<string,unknown>|undefined;
 if(!data||typeof data.reference_id!=='string'||typeof data.id!=='string'||!Number.isSafeInteger(Number(data.value))||Number(data.value)<=0)return reply('Payload not yet recognized; verify provider contract',422);
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:ok,error}=await admin.rpc('aeromind_fulfill_pix',{p_event_id:evt.id,p_reference_id:data.reference_id,p_amount_cents:Number(data.value),p_provider_transaction_id:data.id});
 if(error||ok!==true)return reply('Reconciliation failed',422);
 return reply('Received',200);
}
