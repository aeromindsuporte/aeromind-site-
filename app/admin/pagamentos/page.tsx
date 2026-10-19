import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
export const dynamic='force-dynamic';
type Order={id:string,created_at:string,status:string,amount_cents:number,plan_name:string,email:string};
export default async function AdminPayments(){
 const {sb}=await requireAdmin();const [orders,summary]=await Promise.all([sb.rpc('aeromind_admin_orders'),sb.rpc('aeromind_admin_commercial_snapshot')]);
 const list=(Array.isArray(orders.data)?orders.data:[]) as Order[],s=summary.data||{};
 return <CommercialAdminShell active="/admin/pagamentos" title="Pagamentos e pedidos" description="Movimentações reais do servidor. Pedidos não confirmados nunca entram na receita.">
 <section className="admin-stats"><div className="admin-stat"><div className="admin-stat-body"><span>Receita confirmada</span><strong>{(Number(s.revenue_cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div></div><div className="admin-stat"><div className="admin-stat-body"><span>Pedidos pagos</span><strong>{s.orders_paid??0}</strong></div></div><div className="admin-stat"><div className="admin-stat-body"><span>Pendentes</span><strong>{s.orders_pending??0}</strong></div></div></section>
 <section className="admin-card"><p className="admin-card-explain">O Pix real permanece bloqueado até a troca das credenciais expostas e os testes de homologação da PaggPay.</p>
 {orders.error||summary.error?<p className="admin-feedback bad">Não foi possível consultar os pagamentos.</p>:<div className="admin-table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Plano</th><th>Valor</th><th>Status</th></tr></thead><tbody>
 {list.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleString('pt-BR')}</td><td className="admin-email">{o.email}</td><td>{o.plan_name}</td><td>{(o.amount_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>{o.status}</td></tr>)}
 {!list.length&&<tr><td colSpan={5}>Nenhuma transação registrada.</td></tr>}</tbody></table></div>}</section></CommercialAdminShell>;
}
