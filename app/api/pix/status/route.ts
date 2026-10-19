import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
const json=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){
 try{
  const sb=await createClient();const {data:{user},error}=await sb.auth.getUser();
  if(error||!user)return json({error:'Faça login.'},401);
  const id=new URL(req.url).searchParams.get('id')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id))return json({error:'Pedido inválido.'},400);
  const {data:order,error:db}=await sb.from('aeromind_payment_orders')
   .select('id,status,amount_cents,plan_name,created_at,paid_at')
   .eq('id',id).eq('user_id',user.id).maybeSingle();
  if(db||!order)return json({error:'Pedido não encontrado.'},404);
  return json({status:order.status,amountCents:order.amount_cents,planName:order.plan_name,createdAt:order.created_at,paidAt:order.paid_at});
 }catch{return json({error:'Não foi possível consultar o pedido.'},500);}
}
