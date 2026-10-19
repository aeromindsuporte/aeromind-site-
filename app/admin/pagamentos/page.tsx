import Link from 'next/link';import {redirect} from 'next/navigation';import {createClient} from '@/lib/supabase/server';import '../admin.css';
export const dynamic='force-dynamic';
type Order={id:string;email:string;created_at:string;reference_id:string;amount_cents:number;status:string;plan_name:string;plan_slug:string};
export default async function Payments(){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fadmin%2Fpagamentos');
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();if(!staff)redirect('/minha-conta');
 const [orders,s]=await Promise.all([sb.rpc('aeromind_admin_orders'),sb.rpc('aeromind_admin_commercial_snapshot')]);
 const items=Array.isArray(orders.data)?orders.data as Order[]:[];
 const stats=(s.data||{}) as {orders_total?:number;orders_paid?:number;orders_pending?:number;revenue_cents?:number};
 const money=(n:number)=>Number(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 return <main className="admin-root"><header className="admin-top"><Link className="admin-top-brand" href="/admin">← AeroMind <span>ADMIN</span></Link></header><div className="admin-content">
 <h1>Pedidos e pagamentos</h1><p className="admin-card-explain">Pedidos reais registrados no banco. Integração Pix em homologação; pagamentos de produção desativados.</p>
 <div className="admin-stats">{[['Pedidos',stats.orders_total],['Pagos',stats.orders_paid],['Pendentes',stats.orders_pending]].map(([label,v])=><div className="admin-stat purple" key={String(label)}><strong>{s.error?'—':Number(v)||0}</strong><span>{String(label)}</span></div>)}<div className="admin-stat green"><strong>{s.error?'—':money(Number(stats.revenue_cents)||0)}</strong><span>Receita registrada como paga (inclui sandbox)</span></div></div>
 {(orders.error||s.error)&&<p className="admin-feedback bad">Não foi possível carregar todos os dados.</p>}
 <section className="admin-card" style={{marginTop:24}}><h2>Últimos pedidos</h2><div className="admin-table-scroll"><table><thead><tr><th>Data</th><th>Conta</th><th>Plano</th><th>Valor</th><th>Situação</th><th>Referência</th></tr></thead><tbody>{items.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td><td className="admin-email">{o.email}</td><td>{o.plan_name}</td><td>{money(o.amount_cents)}</td><td>{o.status}</td><td>{o.reference_id}</td></tr>)}{!items.length&&<tr><td colSpan={6}>Nenhum pedido registrado.</td></tr>}</tbody></table></div></section><p><Link className="admin-inline-action" href="/checkout">Abrir checkout de homologação →</Link></p></div></main>;
}