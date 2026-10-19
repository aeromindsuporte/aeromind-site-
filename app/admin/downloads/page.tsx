import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
export const dynamic='force-dynamic';
type Event={requested_at:string,user_id:string,email:string,version_name:string};
export default async function Downloads(){
 const {sb}=await requireAdmin();
 const [r,s]=await Promise.all([sb.rpc('aeromind_admin_downloads'),sb.rpc('aeromind_admin_commercial_snapshot')]);
 const events=(Array.isArray(r.data)?r.data:[]) as Event[],stats=s.data||{};
 return <CommercialAdminShell active="/admin/downloads" title="Solicitações de download" description="Links de APK emitidos com identificação da conta e versão. Não representam instalações concluídas.">
 <section className="admin-stats"><div className="admin-stat"><div className="admin-stat-body"><span>Links emitidos</span><strong>{stats.requests_total??'—'}</strong></div></div><div className="admin-stat"><div className="admin-stat-body"><span>Contas distintas</span><strong>{stats.download_accounts??'—'}</strong></div></div><div className="admin-stat"><div className="admin-stat-body"><span>Últimos 7 dias</span><strong>{stats.requests_7d??'—'}</strong></div></div></section>
 <section className="admin-card">{r.error||s.error?<p className="admin-feedback bad">Não foi possível consultar os registros.</p>:<div className="admin-table-scroll"><table><thead><tr><th>Data</th><th>Conta</th><th>Versão</th><th>Ação</th></tr></thead><tbody>
 {events.map((e,i)=><tr key={e.user_id+e.requested_at+i}><td>{new Date(e.requested_at).toLocaleString('pt-BR')}</td><td className="admin-email">{e.email}</td><td>{e.version_name}</td><td><Link className="admin-inline-action" href={'/admin/cliente/'+e.user_id}>Gerenciar</Link></td></tr>)}
 {!events.length&&<tr><td colSpan={4}>Nenhum link emitido até agora.</td></tr>}</tbody></table></div>}</section></CommercialAdminShell>;
}
