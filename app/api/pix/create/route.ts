import {NextResponse} from 'next/server';
import {createClient as client} from '@/lib/supabase/server';
import {createClient as serviceClient} from '@supabase/supabase-js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request) {
 if(process.env.PAGGPAY_MODE!=='sandbox'||!process.env.PAGGPAY_API_KEY||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.PAGGPAY_WEBHOOK_URL||!process.env.PAGGPAY_WEBHOOK_SECRET) return fail('Pix desativado durante a homologação.',503);
 try {
  const sb=await client();const {data:{user}}=await sb.auth.getUser();
  if(!user)return fail('Entre na sua conta.',401);
  const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
  if(!staff)return fail('Sandbox disponível apenas para administradores.',403);
  const payload=await req.json() as {plan?:string,payerName?:string,document?:string,coupon?:string};
  const slug=String(payload.plan||''),name=String(payload.payerName||'').trim();
  const doc=String(payload.document||'').replace(/[^0-9]/g,'');
  if(!/^(basico|pro|ultra)-(mensal|trimestral|semestral|anual)$/.test(slug)||name.length<3||name.length>120||![11,14].includes(doc.length))return fail('Plano ou dados do pagador inválidos.',400);
  const {data,error}=await sb.rpc('aeromind_create_pix_order',{p_slug:slug});
  if(error||!data)return fail('Não foi possível preparar o pedido.',400);
  let order=data as {order_id:string,reference_id:string,amount_cents:number};
  const coupon=(payload.coupon||'').trim();
  if(coupon){
   if(!/^[a-zA-Z0-9_-]{4,24}$/.test(coupon))return fail('Cupom inválido.',400);
   const applied=await sb.rpc('aeromind_apply_coupon_to_order',{p_order_id:order.order_id,p_code:coupon});
   if(applied.error||typeof applied.data!=='number')return fail('Cupom inválido, vencido ou esgotado.',400);
   order={...order,amount_cents:applied.data};
  }
  const r=await fetch('https://sandbox-api.paggpay.com/v1/pix',{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+process.env.PAGGPAY_API_KEY,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({reference_id:order.reference_id,value:order.amount_cents,description:'AeroMind '+slug,payer_name:name,payer_email:user.email,payer_national_registration:doc,webhook_url:process.env.PAGGPAY_WEBHOOK_URL})});
  const json=await r.json().catch(()=>null) as Record<string,unknown>|null;
  if(!r.ok||!json)return fail('Falha na geração do Pix de teste.',502);
  const info=(typeof json.data==='object'&&json.data!==null?json.data:json) as Record<string,unknown>;
  const tx=typeof info.id==='string'?info.id:null;
  if(!tx)return fail('Resposta de Pix sem identificador; o pedido não foi liberado.',502);
  const admin=serviceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:e}=await admin.from('aeromind_payment_orders').update({status:'pending',provider_transaction_id:tx}).eq('id',order.order_id).eq('status','created');
  if(e)return fail('Erro ao conciliar o pedido.',502);
  const emv=typeof info.emv==='string'?info.emv:typeof info.pix_copy_paste==='string'?info.pix_copy_paste:null;
  return NextResponse.json({environment:'sandbox',status:'pending',orderId:order.order_id,amountCents:order.amount_cents,emv},{headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Falha ao gerar Pix em ambiente de teste.',500);}
}
