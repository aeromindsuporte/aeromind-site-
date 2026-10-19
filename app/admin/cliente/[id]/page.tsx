import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {saveLicense,saveDeviceLimit,revokeAdminDevice} from '@/app/admin/actions';
import '../../admin.css';

export const dynamic='force-dynamic';
type Lic={id:string;plan_name:string;status:string;valid_until:string|null;created_at:string;max_devices:number};
type Device={id:string;device_name:string;status:string;last_seen_at:string|null;registered_at:string};
type Detail={id:string;email:string;display_name:string|null;created_at:string;confirmed:boolean;licenses:Lic[];devices:Device[];requests_total:number;tickets_total:number;orders_total:number};
const date=(raw:string|null)=>raw?new Date(raw).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
export default async function CustomerDetails({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{msg?:string}>}){
 const {id}=await params;const {msg}=await searchParams;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id))notFound();
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/entrar?next=%2Fadmin%2Fclientes');
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
 if(!staff)redirect('/minha-conta');
 const {data,error}=await sb.rpc('aeromind_admin_customer',{p_user_id:id});
 if(error||!data)notFound();
 const customer=data as Detail;
 const current=customer.licenses?.[0];
 const selected=current?.status||'pending';
 const defaultDate=current?.valid_until?new Date(current.valid_until).toISOString().slice(0,10):'';
 return <main className="admin-root area-clientes">
 <header className="admin-top"><Link className="admin-top-brand" href="/admin/clientes">← AeroMind <span>CLIENTES</span></Link><Link className="admin-account-link" href="/admin">Painel administrativo</Link></header>
 <div className="admin-content" style={{maxWidth:1100,margin:'0 auto'}}>
  <span className="admin-eyebrow">GERENCIAMENTO INDIVIDUAL</span>
  <h1 style={{marginBottom:8}}>{customer.display_name||'Cliente AeroMind'}</h1>
  <p className="admin-card-explain" style={{overflowWrap:'anywhere'}}>{customer.email} · {customer.confirmed?'E-mail confirmado':'E-mail pendente'} · Cadastrado em {date(customer.created_at)}</p>
  {msg&&<p className={'admin-feedback '+(msg.endsWith('saved')?'good':'bad')} role="status">{msg==='license-saved'?'Licença atualizada.':msg==='limit-saved'?'Limite de aparelhos atualizado.':'Confira os dados informados.'}</p>}
  <div className="admin-stats">
   <div className="admin-stat purple"><div className="admin-stat-body"><span>Plano atual</span><strong>{current?.plan_name||'Nenhum'}</strong><small>{current?.status||'Sem licença'}</small></div></div>
   <div className="admin-stat green"><div className="admin-stat-body"><span>Validade</span><strong>{date(current?.valid_until||null)}</strong><small>{current?.max_devices||2} aparelhos permitidos</small></div></div>
   <div className="admin-stat blue"><div className="admin-stat-body"><span>Links de download solicitados</span><strong>{customer.requests_total||0}</strong><small>Não garante download concluído</small></div></div>
   <div className="admin-stat yellow"><div className="admin-stat-body"><span>Pedidos / Chamados</span><strong>{customer.orders_total||0} / {customer.tickets_total||0}</strong><small>Histórico do cliente</small></div></div>
  </div>
  <div className="admin-main-grid">
   <section className="admin-card admin-wide">
    <h2>Gerenciar licença de {customer.email}</h2>
    <form className="admin-edit-grid" action={saveLicense}>
     <input type="hidden" name="return_to" value={customer.id}/>
     <label>E-mail do cliente<input name="email" type="email" readOnly value={customer.email}/></label>
     <label>Plano<select name="tier" defaultValue={current?.plan_name||'Pro'}><option>Básico</option><option>Pro</option><option>Ultra</option></select></label>
     <label>Situação<select name="status" defaultValue={selected}><option value="pending">Pendente</option><option value="active">Ativa</option><option value="expired">Expirada</option><option value="suspended">Suspensa</option><option value="revoked">Revogada</option></select></label>
     <label>Validade<input name="valid_until" type="date" defaultValue={defaultDate}/></label>
     <label className="admin-full">Observação interna<textarea name="note" maxLength={500} rows={2} placeholder="Motivo da alteração"/></label>
     <div className="admin-form-foot"><small>Alterações registradas na auditoria de licenças.</small><button type="submit">Salvar licença</button></div>
    </form>
    <div style={{borderTop:'1px solid #37447f',marginTop:24,paddingTop:22}}>
     <h3>Limite de dispositivos</h3>
     <form className="admin-edit-grid" action={saveDeviceLimit}>
      <input name="return_to" type="hidden" value={customer.id}/>
      <input name="email" type="hidden" value={customer.email}/>
      <label>Máximo de aparelhos autorizados<input name="max_devices" type="number" min="1" max="20" defaultValue={current?.max_devices||2} required/></label>
      <div className="admin-form-foot"><small>Valores de 1 a 20.</small><button type="submit">Salvar limite</button></div>
     </form>
    </div>
   </section>
   <section className="admin-card admin-side">
    <h2>Licenças anteriores</h2>
    {customer.licenses?.length?customer.licenses.map(l=><p key={l.id} className="admin-card-explain"><strong>{l.plan_name}</strong> · {l.status}<br/>Válida até {date(l.valid_until)}</p>):<p>Nenhuma licença cadastrada.</p>}
    <Link href="/admin/relatorios" className="admin-inline-action">Ver relatórios →</Link>
   </section>
   <section className="admin-card admin-wide">
    <h2>Aparelhos do cliente</h2>
    <div className="admin-table-scroll"><table><thead><tr><th>Aparelho</th><th>Situação</th><th>Última atividade</th><th>Ação</th></tr></thead><tbody>
    {customer.devices?.length?customer.devices.map(d=><tr key={d.id}><td>{d.device_name}</td><td>{d.status}</td><td>{date(d.last_seen_at)}</td><td>{d.status!=='revoked'?<form action={revokeAdminDevice}><input type="hidden" name="device_id" value={d.id}/><button className="admin-inline-action admin-danger-action">Revogar</button></form>:'—'}</td></tr>):<tr><td colSpan={4}>Nenhum aparelho cadastrado.</td></tr>}
    </tbody></table></div>
   </section>
  </div>
  <Link href="/admin/clientes" className="admin-inline-action">← Voltar à lista de clientes</Link>
 </div></main>;
}
