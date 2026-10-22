import {notFound} from 'next/navigation';
import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {saveLicense,saveDeviceLimit,revokeAdminDevice} from '@/app/admin/actions';
import {dateInputBrazil,effectiveLicenseStatus,formatLicenseExpiryBrazil,labelForLicenseStatus} from '@/lib/license-status';
export const dynamic='force-dynamic';
type License={id:string,plan_name:string,status:string,valid_until:string|null,max_devices:number};
type Device={id:string,device_name:string,status:string,last_seen_at:string|null};
type Customer={id:string,email:string,display_name:string|null,confirmed:boolean,licenses:License[],devices:Device[],requests_total:number,tickets_total:number,orders_total:number};
export default async function CustomerPage({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{msg?:string}>}){
 const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id))notFound();
 const {sb}=await requireAdmin();const {data,error}=await sb.rpc('aeromind_admin_customer',{p_user_id:id});
 if(error||!data)notFound();
 const customer=data as Customer,license=customer.licenses?.[0],{msg}=await searchParams;
 const now=Date.now();
 const licenseLabel=labelForLicenseStatus(license?.status,license?.valid_until,now);
 const overdue=effectiveLicenseStatus(license?.status,license?.valid_until,now)==='overdue';
 return <CommercialAdminShell active="/admin/clientes" title={customer.display_name||'Gerenciar cliente'} description={customer.email}>
 <p><Link href="/admin/clientes">← Voltar aos clientes</Link></p>
 {msg&&<p className={'admin-feedback '+(msg==='license-saved'||msg==='limit-saved'||msg==='device-revoked'?'good':'bad')}>{msg==='license-saved'?'Licença salva.':msg==='limit-saved'?'Limite alterado.':msg==='device-revoked'?'Aparelho revogado.':'Verifique os dados e tente novamente.'}</p>}
 <section className="admin-stats">{[['Licença',licenseLabel],['Links APK',customer.requests_total||0],['Pedidos',customer.orders_total||0],['Chamados',customer.tickets_total||0]].map(([name,value])=><div className="admin-stat" key={name}><div className="admin-stat-body"><span>{name}</span><strong>{value}</strong></div></div>)}</section>
 <section className="admin-card"><h2>Licença e acesso</h2>
 <p className="admin-card-explain">Você está gerenciando apenas este cliente. Ações são auditadas.</p>
 <p className="admin-card-explain"><strong>Status atual: {licenseLabel}</strong> · Vencimento: {formatLicenseExpiryBrazil(license?.valid_until)}</p>
 {overdue&&<p className="admin-feedback bad" role="status">A licença está vencida e o acesso é bloqueado pelo servidor, mesmo que o registro histórico tenha o status técnico “active”. Para renovar, informe nova validade futura e salve.</p>}
 <form action={saveLicense} className="admin-edit-grid"><input type="hidden" name="email" value={customer.email}/><input type="hidden" name="customer_id" value={id}/>
 <label>Plano<select name="tier" defaultValue={license?.plan_name||'Pro'}><option>Básico</option><option>Pro</option><option>Ultra</option></select></label>
 <label>Situação<select name="status" defaultValue={license?.status||'pending'}><option value="pending">Pendente</option><option value="active">Ativa</option><option value="suspended">Suspensa</option><option value="expired">Expirada</option><option value="revoked">Revogada</option></select></label>
 <label>Validade<input name="valid_until" type="date" defaultValue={dateInputBrazil(license?.valid_until)}/></label>
 <label className="admin-full">Motivo da alteração<textarea name="note" rows={2} maxLength={500} placeholder="Observação administrativa"/></label>
 <div className="admin-form-foot"><button>Salvar licença deste cliente</button></div></form>
 <hr style={{margin:'24px 0',opacity:.22}}/><h3>Aparelhos permitidos</h3>
 <form action={saveDeviceLimit} className="admin-edit-grid"><input type="hidden" name="email" value={customer.email}/><input type="hidden" name="customer_id" value={id}/><label>Quantidade de aparelhos<input name="max_devices" type="number" min="1" max="20" defaultValue={license?.max_devices||2}/></label><div className="admin-form-foot"><button>Atualizar limite</button></div></form>
 </section>
 <section className="admin-card" style={{marginTop:16}}><h2>Aparelhos vinculados</h2><div className="admin-table-scroll"><table><thead><tr><th>Aparelho</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{customer.devices?.map(d=><tr key={d.id}><td>{d.device_name}</td><td>{d.status}</td><td>{d.status!=='revoked'?<form action={revokeAdminDevice}><input type="hidden" name="device_id" value={d.id}/><input type="hidden" name="customer_id" value={id}/><button className="admin-danger-action">Revogar</button></form>:'—'}</td></tr>)}{!customer.devices?.length&&<tr><td colSpan={3}>Nenhum aparelho vinculado.</td></tr>}</tbody></table></div></section>
 </CommercialAdminShell>;
}
