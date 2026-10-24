import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
export const dynamic='force-dynamic';
export default async function Reports(){
 const {sb}=await requireAdmin();
 const [a,b]=await Promise.all([sb.rpc('aeromind_admin_overview'),sb.rpc('aeromind_admin_commercial_snapshot')]);
 const d=a.data||{},s=b.data||{};
 const metrics=[
 ['Clientes',d.users_total??0],['Licenças ativas',d.licenses_active??0],['Licenças vencidas',d.licenses_expired??0],
 ['Vencem em 7 dias',d.licenses_expiring_7d??0],['Links de APK',s.requests_total??0],['Contas com links',s.download_accounts??0],
 ['Pedidos pagos',s.orders_paid??0],['Pedidos pendentes',s.orders_pending??0],
 ['Cupons ativos',s.coupons_active??0],['Chamados abertos',s.tickets_open??0],['Em atendimento',s.tickets_progress??0],['Chamados resolvidos',s.tickets_resolved??0]];
 return <CommercialAdminShell active="/admin/relatorios" title="Relatórios gerenciais" description="Indicadores do banco de dados. Não utilizamos receitas ou acessos fictícios.">
 {a.error||b.error?<p className="admin-feedback bad">Parte das informações está indisponível.</p>:null}
 <section className="admin-stats">{metrics.map(([label,value])=><div className="admin-stat" key={label}><div className="admin-stat-body"><span>{label}</span><strong>{value}</strong></div></div>)}</section>
 <section className="admin-card"><h2>Receita confirmada</h2><strong style={{fontSize:32}}>{(Number(s.revenue_cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong>
 <p className="admin-card-explain">Conta apenas pedidos realmente confirmados como pagos. Links emitidos não equivalem a downloads concluídos ou instalações.</p>
 <p><Link className="admin-inline-action" href="/admin/gold/monitoramento">Monitoramento e relatórios Gold →</Link></p><p><Link className="admin-inline-action" href="/admin/downloads">Histórico de downloads →</Link></p><p><Link className="admin-inline-action" href="/admin/pagamentos">Pedidos e pagamentos →</Link></p><p><Link className="admin-inline-action" href="/admin/suporte">Central de suporte →</Link></p></section></CommercialAdminShell>;
}
