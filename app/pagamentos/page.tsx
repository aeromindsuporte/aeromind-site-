import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export const metadata={title:'Meus pagamentos | AeroMind'};
type Order={id:string,plan_name:string,status:string,amount_cents:number,created_at:string,paid_at:string|null};
export default async function Payments(){
 const sb=await createClient(),{data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fpagamentos');
 const {data,error}=await sb.from('aeromind_payment_orders').select('id,plan_name,status,amount_cents,created_at,paid_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);
 return <main className="account-root"><header className="account-header"><Link href="/minha-conta" className="auth-logo">← AeroMind</Link></header>
 <div className="account-container"><span className="auth-eyebrow">MINHA CONTA</span><h1>Pagamentos e <em>renovações</em></h1><p className="account-lead">Confira seus pedidos. A licença só é ativada após confirmação do pagamento.</p>
 {error?<p className="device-notice error">Não foi possível carregar pedidos.</p>:<section className="account-card"><h2>Meu histórico</h2>
 {(data as Order[]||[]).map(o=><div key={o.id} style={{padding:'15px 0',borderBottom:'1px solid #44547a'}}><strong>{o.plan_name}</strong><p>Pedido de {new Date(o.created_at).toLocaleDateString('pt-BR')} · {(o.amount_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><span>{o.status==='paid'?'Pago':o.status==='pending'?'Aguardando pagamento':o.status==='created'?'Criado':o.status}</span><p><Link href={o.status==='paid'?'/ativacao?pedido='+o.id:'/checkout/retorno?pedido='+o.id}>{o.status==='paid'?'Continuar para o aplicativo →':'Acompanhar pedido →'}</Link></p></div>)}
 {!data?.length&&<p>Nenhum pedido realizado.</p>}</section>}
 <p style={{marginTop:20}}><Link className="auth-secondary auth-button-link" href="/planos">Conhecer planos →</Link></p></div></main>;
}
