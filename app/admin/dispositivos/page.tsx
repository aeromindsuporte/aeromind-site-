import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {revokeAdminDevice} from '@/app/admin/actions';
export const dynamic='force-dynamic';
type Device={id:string,email:string,name:string,os_version:string|null,status:string,registered_at:string,last_seen_at:string|null};
const when=(date:string|null)=>date?new Date(date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
export default async function AdminDevices({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {sb}=await requireAdmin();
 const {data,error}=await sb.rpc('aeromind_admin_devices');
 const items=(Array.isArray(data?.devices)?data.devices:[]) as Device[];
 const {msg}=await searchParams;
 return <CommercialAdminShell active="/admin/dispositivos" title="Dispositivos" description="Veja os vínculos Android, últimos acessos e revogue autorizações.">
 {msg&&<p role="status" className={'admin-feedback '+(msg==='device-revoked'?'good':'bad')}>{msg==='device-revoked'?'Aparelho revogado no servidor.':'Não foi possível revogar o aparelho.'}</p>}
 {error?<p role="alert" className="admin-feedback bad">Consulta dos dispositivos indisponível. Nenhuma alteração foi realizada.</p>:
 <>
 <section className="admin-stats">
  {[['Total',items.length],['Ativos',items.filter(x=>x.status==='active').length],
   ['Pendentes',items.filter(x=>x.status==='pending').length],['Revogados',items.filter(x=>x.status==='revoked').length]]
   .map(([k,v])=><div key={String(k)} className="admin-stat"><div className="admin-stat-body"><span>{k}</span><strong>{v}</strong></div></div>)}
 </section>
 <section className="admin-card"><h2>Aparelhos vinculados</h2>
 <p className="admin-card-explain">Até 100 aparelhos, ordenados por cadastro. Revogar impede novos acessos desse dispositivo. Essa ação não pode ser desfeita por aqui.</p>
 <div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>Aparelho</th><th>Estado</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>
 {items.map(d=><tr key={d.id}><td className="admin-email">{d.email}</td><td>{d.name}<small className="admin-device-os">{d.os_version||'Android'}</small></td>
 <td><span className={'admin-pill status-'+d.status}>{d.status==='active'?'Ativo':d.status==='pending'?'Pendente':'Revogado'}</span></td>
 <td>{when(d.last_seen_at)}</td>
 <td><div className="admin-row-actions"><Link className="admin-inline-action" href={'/admin/cliente/localizar?email='+encodeURIComponent(d.email)}>Cliente →</Link>
 {d.status!=='revoked'&&<form action={revokeAdminDevice}><input type="hidden" name="device_id" value={d.id}/><button type="submit" className="admin-inline-action admin-danger-action">Revogar</button></form>}
 </div></td></tr>)}
 {!items.length&&<tr><td colSpan={5}>Nenhum dispositivo registrado.</td></tr>}</tbody></table></div>
 </section></>}
 </CommercialAdminShell>;
}
