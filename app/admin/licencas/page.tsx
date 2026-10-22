import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {saveLicense,saveDeviceLimit} from '@/app/admin/actions';
import {formatLicenseExpiryBrazil,labelForLicenseStatus,effectiveLicenseStatus} from '@/lib/license-status';
export const dynamic='force-dynamic';
type License={id:string,email:string,plan_name:string,status:string,valid_until:string|null,created_at:string};
export default async function AdminLicenses({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {sb}=await requireAdmin();
 const {data,error}=await sb.rpc('aeromind_admin_overview');
 const licenses=(Array.isArray(data?.licenses)?data.licenses:[]) as License[];
 const {msg}=await searchParams;
 const info:Record<string,string>={
  'license-saved':'Licença atualizada e registrada na auditoria.',
  'limit-saved':'Limite de aparelhos atualizado.',
  'expiry':'Uma licença ativa precisa de data futura.',
  'invalid':'Confira e-mail, plano, status e validade.',
  'license-error':'Não foi possível salvar no servidor. Confira a conta e os campos.'
 };
 return <CommercialAdminShell active="/admin/licencas" title="Licenças" description="Consulte a validade real, ative, suspenda, renove e gerencie os limites de aparelhos.">
 {msg&&<p className={'admin-feedback '+(msg.endsWith('saved')?'good':'bad')} role="status">{info[msg]||'Não foi possível completar a operação.'}</p>}
 {error?<p className="admin-feedback bad" role="alert">Não foi possível carregar licenças. Nenhum dado foi alterado.</p>:<>
 <section className="admin-stats">
  {[['Ativas',data.licenses_active??0],['Vencidas',data.licenses_expired??0],
   ['Pendentes',data.licenses_pending??0],['Vencem em 7 dias',data.licenses_expiring_7d??0]]
   .map(([name,count])=><div className="admin-stat" key={String(name)}><div className="admin-stat-body"><span>{name}</span><strong>{count}</strong></div></div>)}
 </section>
 <section className="admin-card"><h2>Licenças recentes</h2>
  <p className="admin-card-explain">São exibidas até 100 licenças. O status mostrado considera também a hora exata do vencimento.</p>
  <div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>Plano</th><th>Situação</th><th>Vencimento (Brasília)</th><th>Ação</th></tr></thead>
   <tbody>{licenses.map(l=><tr key={l.id}><td className="admin-email">{l.email}</td><td>{l.plan_name}</td>
    <td><span className={'admin-pill status-'+(effectiveLicenseStatus(l.status,l.valid_until)==='overdue'?'expired':l.status)}>{labelForLicenseStatus(l.status,l.valid_until)}</span></td>
    <td>{formatLicenseExpiryBrazil(l.valid_until)}</td>
    <td><Link className="admin-inline-action" href={'/admin/cliente/localizar?email='+encodeURIComponent(l.email)}>Gerenciar →</Link></td>
   </tr>)}{!licenses.length&&<tr><td colSpan={5}>Nenhuma licença cadastrada.</td></tr>}</tbody></table></div>
 </section>
 </>}
 <section className="admin-card" style={{marginTop:16}}><h2>Configurar ou renovar licença</h2>
  <p className="admin-card-explain">Use o e-mail confirmado do cliente. A licença ativa precisa de validade futura. A operação é registrada no histórico.</p>
  <form action={saveLicense} className="admin-edit-grid">
   <label>E-mail do cliente<input required type="email" name="email" maxLength={320} placeholder="cliente@email.com"/></label>
   <label>Plano<select name="tier" defaultValue="Básico"><option>Básico</option><option>Pro</option><option>Ultra</option></select></label>
   <label>Situação<select name="status" defaultValue="active"><option value="pending">Pendente</option><option value="active">Ativa</option><option value="suspended">Suspensa</option><option value="expired">Expirada</option><option value="revoked">Revogada</option></select></label>
   <label>Validade (horário de Brasília)<input name="valid_until" type="date"/></label>
   <label className="admin-full">Observação interna<textarea name="note" rows={2} maxLength={500} placeholder="Motivo da alteração"/></label>
   <div className="admin-form-foot"><button type="submit">Salvar licença</button></div>
  </form>
 </section>
 <section className="admin-card" style={{marginTop:16}}><h2>Quantidade de dispositivos</h2>
  <form className="admin-edit-grid" action={saveDeviceLimit}>
   <label>E-mail do cliente<input name="email" type="email" required placeholder="cliente@email.com"/></label>
   <label>Limite de aparelhos<input name="max_devices" type="number" min={1} max={20} defaultValue={2} required/></label>
   <div className="admin-form-foot"><button type="submit">Atualizar limite</button></div>
  </form>
  <p className="admin-card-explain">Para alterar a licença e o limite de uma pessoa sem redigitar o e-mail, <Link href="/admin/clientes">acesse Clientes → Gerenciar</Link>.</p>
 </section>
 </CommercialAdminShell>;
}
