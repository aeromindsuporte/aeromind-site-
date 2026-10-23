import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {NotificationCenter} from './NotificationCenter';
import type {NotificationCampaign} from '@/lib/notification-types';
import './notifications.css';
export const dynamic='force-dynamic';
export const metadata={title:'Central de Notificações | AeroMind',robots:{index:false,follow:false}};
export default async function NotificationsAdmin(){
 const {sb}=await requireAdmin();
 const [campaignResult,readsResult,readCountResult,overviewResult]=await Promise.all([
  sb.from('aeromind_notification_campaigns').select('*').order('updated_at',{ascending:false}).limit(200),
  sb.from('aeromind_notification_deliveries').select('campaign_id,read_at').not('read_at','is',null).limit(10000),
  sb.from('aeromind_notification_deliveries').select('id',{head:true,count:'exact'}).not('read_at','is',null),
  sb.rpc('aeromind_admin_overview')
 ]);
 const campaigns=(campaignResult.data||[]) as NotificationCampaign[];
 const users=(Array.isArray(overviewResult.data?.users)?overviewResult.data.users:[]) as
   {id:string;email:string;display_name:string|null}[];
 const readCounts:Record<string,number>={};
 for(const row of readsResult.data||[])readCounts[row.campaign_id]=(readCounts[row.campaign_id]||0)+1;
 const localToday=new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 const stats={
  drafts:campaigns.filter(x=>x.status==='draft'||x.status==='template').length,
  scheduled:campaigns.filter(x=>x.status==='scheduled').length,
  sentToday:campaigns.filter(x=>x.status==='sent'&&x.sent_at&&
   new Date(x.sent_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})===localToday).length,
  reads:readCountResult.count||0
 };
 const customers=users.map(u=>({id:u.id,label:(u.display_name?u.display_name+' · ':'')+u.email}));
 return <CommercialAdminShell title="Central de Notificações" active="/admin/notificacoes"
  description="Crie, edite, salve, agende e envie notificações para os clientes pelo site.">
   {campaignResult.error&&<p className="admin-feedback bad" role="alert">Não foi possível carregar notificações do servidor. Não realize novos envios até restabelecer a conexão.</p>}
   {readsResult.error&&<p className="admin-feedback bad" role="alert">A contagem de leituras por campanha está indisponível.</p>}
   {!campaignResult.error&&<NotificationCenter campaigns={campaigns} stats={stats} customers={customers} readCounts={readCounts}/>}
 </CommercialAdminShell>;
}
