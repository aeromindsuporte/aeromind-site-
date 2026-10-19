import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export const metadata={title:'Meus pagamentos | AeroMind'};
type Order={id:string;reference_id:string;plan_name:string;plan_slug:string;amount_cents:number;status:string;created_at:string;paid_at:string|null};
const money=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=(s:string)=>new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
export default async function Payments(){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/entrar?next=%2Fpagamentos');
 const {data,error}=await sb.from('aeromind_payment_orders')
 .select('id,reference_id,plan_name,plan_slug,amount_cents,status,created_at,paid_at')
 .eq('user_id',user.id).order('created_at',{ascending:false}).limit(30);
 const orders=(data||[]) as Order[];
 return <main className="account-root"><header className="account-header"><Link href="/minha-conta" className="auth-logo">← AeroMind</Link><Link href="/checkout" className="auth-secondary">Planos →</Link></header>
 <section className="account-container"><span className="auth-eyebrow">MINHA CONTA</span><h1>Pedidos e <em>pagamentos</em></h1>
  <p className="account-lead">Veja o andamento das suas contratações. Uma licença só será liberada após o pagamento ser confirmado pelo servidor.</p>
  {error&&<p role="alert" className="device-notice error">Não foi possível consultar os pagamentos.</p>}
  <div className="account-grid">
   {orders.length?orders.map(o=><section key={o.id} className="account-card">
    <h2>{o.plan_name} · {money(o.amount_cents)}</h2>
    <p><b>Situação</b><span>{o.status==='paid'?'Pago':o.status==='pending'?'Aguardando':o.status==='created'?'Criado':o.status}</span></p>
    <p><b>Data</b><span>{date(o.created_at)}</span></p>
    {o.paid_at&&<p><b>Confirmação</b><span>{date(o.paid_at)}</span></p>}
    <p className="account-note">Referência: {o.reference_id}</p>
   </section>):<section className="account-card"><h2>Nenhum pedido</h2><p>Você ainda não possui pedidos cadastrados.</p><Link className="auth-secondary auth-button-link" href="/planos">Ver planos →</Link></section>}
  </div>
  <p style={{marginTop:24}}><Link className="auth-secondary auth-button-link" href="/suporte">Ajuda com pagamento →</Link></p>
 </section></main>;
}
