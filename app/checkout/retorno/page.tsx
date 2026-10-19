import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Return({searchParams}:{searchParams:Promise<{pedido?:string}>}){
 const sb=await createClient(),{data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fpagamentos');
 const id=(await searchParams).pedido||'';
 const valid=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id);
 const result=valid?await sb.from('aeromind_payment_orders').select('status,plan_name,amount_cents,created_at').eq('id',id).eq('user_id',user.id).maybeSingle():null;
 const order=result?.data;
 return <main className="account-root"><header className="account-header"><Link href="/pagamentos" className="auth-logo">← AeroMind · Pedidos</Link></header><div className="account-container"><span className="auth-eyebrow">PAGAMENTO</span>
 <h1>Situação do <em>pedido</em></h1><section className="account-card">{order?<><h2>{order.status==='paid'?'Pagamento confirmado':order.status==='pending'||order.status==='created'?'Aguardando confirmação':'Pedido '+order.status}</h2><p>{order.plan_name} · {(order.amount_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><p>O retorno a esta página não ativa a licença. Apenas a confirmação verificada pelo servidor pode liberar o aplicativo.</p></>:<p>Pedido não encontrado.</p>}
 <Link href={order?.status==='paid'?'/minha-conta':'/checkout/retorno?pedido='+id} className="auth-secondary auth-button-link">{order?.status==='paid'?'Abrir minha conta':'Atualizar situação'}</Link></section></div></main>;
}
