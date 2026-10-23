import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {markDeviceEventSeen} from './actions';

export const dynamic='force-dynamic';
type EventType='registered'|'reactivated'|'authorized'|'revoked'|'support_request';
type Activity={
 id:number;user_id:string;customer_email:string;customer_name:string;
 device_id:string|null;device_name:string|null;actor_kind:'cliente'|'equipe'|'sistema';
 event_type:EventType;ticket_id:string|null;ticket_status:string|null;
 detail:string|null;occurred_at:string;reviewed_at:string|null;
};
const titles:Record<EventType,string>={
 registered:'Novo aparelho solicitado',
 reactivated:'Novo vínculo solicitado',
 authorized:'Aparelho autorizado',
 revoked:'Acesso revogado',
 support_request:'Solicitação sobre aparelho',
};
const when=(date:string)=>new Date(date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
const options=[['todas','Todas'],['pendentes','Não verificadas'],['revoked','Revogações'],['support_request','Pedidos de troca'],['registered','Novos aparelhos']];
export default async function DeviceActivityAdmin({searchParams}:{searchParams:Promise<{filtro?:string;msg?:string}>}){
 const {sb}=await requireAdmin();
 const [result,counts]=await Promise.all([
  sb.rpc('aeromind_admin_device_activity',{p_limit:300}),
  sb.from('aeromind_device_activity').select('id',{head:true,count:'exact'}).is('reviewed_at',null)
 ]);
 const entries=(Array.isArray(result.data)?result.data:[]) as Activity[];
 const {filtro='todas',msg}=await searchParams;
 const active=options.some(([key])=>key===filtro)?filtro:'todas';
 const events=entries.filter(e=>
  active==='todas'||(active==='pendentes'?e.reviewed_at===null:
   active==='registered'?(e.event_type==='registered'||e.event_type==='reactivated'):e.event_type===active));
 const pending=counts.count??entries.filter(e=>e.reviewed_at===null).length;
 const revocations=entries.filter(e=>e.event_type==='revoked').length;
 const requests=entries.filter(e=>e.event_type==='support_request').length;
 return <CommercialAdminShell active="/admin/movimentacoes" title="Movimentações de aparelhos"
   description="Notificações e histórico de autorizações, revogações e solicitações de troca.">
  {msg==='reviewed'&&<p role="status" className="admin-feedback good">Movimentação marcada como verificada.</p>}
  {(msg==='error'||msg==='invalid')&&<p role="alert" className="admin-feedback bad">Não foi possível confirmar esta movimentação.</p>}
  {result.error&&<p role="alert" className="admin-feedback bad">Não foi possível carregar a central. Atualize a página e tente novamente.</p>}
  <section className="admin-stats" aria-label="Resumo de movimentações">
   {[
    ['Pendentes de leitura',pending],
    ['Revogações recentes',revocations],
    ['Solicitações de troca',requests],
    ['Eventos exibidos',entries.length]
   ].map(([label,value])=><div className="admin-stat" key={String(label)}><div className="admin-stat-body"><span>{label}</span><strong>{value}</strong></div></div>)}
  </section>
  <section className="admin-card">
   <h2>Central de notificações</h2>
   <p className="admin-card-explain">Toda autorização, revogação ou solicitação relacionada a aparelhos fica vinculada ao cliente. Marcar como verificado não altera o acesso do aparelho nem encerra o chamado.</p>
   <nav aria-label="Filtrar movimentações" className="device-activity-filters">
    {options.map(([key,label])=><Link key={key} href={'/admin/movimentacoes?filtro='+key}
       aria-current={active===key?'page':undefined} className={'device-activity-filter'+(active===key?' active':'')}>{label}</Link>)}
   </nav>
   {!result.error&&<div className="device-activity-list">
    {events.map(e=><article className={'device-activity-item'+(!e.reviewed_at?' new':'')} key={e.id}>
      <div className="device-activity-main">
       <div className="device-activity-heading">
        <strong>{titles[e.event_type]||'Movimentação'}</strong>
        {!e.reviewed_at&&<span className="device-activity-new">Nova</span>}
        <small>{when(e.occurred_at)}</small>
       </div>
       <p><b>{e.customer_name||e.customer_email||'Cliente'}</b>
        {e.customer_name&&e.customer_email?<span> · {e.customer_email}</span>:null}</p>
       <p>{e.device_name|| (e.event_type==='support_request'?'Solicitação pelo suporte':'Aparelho não identificado')}
        {e.detail?' · '+e.detail:''}</p>
       <small>Origem: {e.actor_kind==='cliente'?'Cliente':e.actor_kind==='equipe'?'Equipe AeroMind':'Sistema'}
        {e.ticket_id?' · Chamado '+(e.ticket_status==='resolved'?'resolvido':e.ticket_status==='in_progress'?'em atendimento':'aberto'):''}</small>
      </div>
      <div className="device-activity-actions">
        <Link href={'/admin/cliente/'+e.user_id}>Ver cliente</Link>
        {e.ticket_id&&<Link href={'/admin/suporte?ticket='+e.ticket_id}>Abrir solicitação</Link>}
        {!e.reviewed_at?<form action={markDeviceEventSeen}>
          <input type="hidden" name="event_id" value={e.id}/>
          <button type="submit">Marcar verificado</button>
        </form>:<span className="device-activity-done">Verificado</span>}
      </div>
    </article>)}
    {!events.length&&<p className="admin-empty">{entries.length?'Nenhuma movimentação neste filtro.':'Nenhuma movimentação registrada ainda.'}</p>}
   </div>}
   <p className="admin-card-explain">Exibindo até 300 eventos recentes. Os registros anteriores continuam armazenados no banco de dados, inclusive os importados do histórico de auditoria.</p>
  </section>
 </CommercialAdminShell>;
}
