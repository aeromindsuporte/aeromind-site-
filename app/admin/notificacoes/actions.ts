'use server';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/admin-access';
import type {NotificationInput,NotificationResult} from '@/lib/notification-types';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUrl=(value:string)=>/^\/(?!\/)[^:\\]*$/.test(value)&&value.length<=180;
function sanitize(input:NotificationInput):{data:Record<string,unknown>|null;error?:string}{
 if(!input||typeof input!=='object')return {data:null,error:'Formulário inválido.'};
 const title=String(input.title||'').trim(),body=String(input.body||'').trim();
 if(title.length<4||title.length>100||body.length<5||body.length>500)return {data:null,error:'Informe título (4 a 100 caracteres) e mensagem (5 a 500 caracteres).'};
 if(!['radar','comunicado','atualizacao','licenca'].includes(input.category))return {data:null,error:'Categoria inválida.'};
 if(!['active','all','tier','user'].includes(input.audience_type))return {data:null,error:'Público inválido.'};
 if(!['draft','template','scheduled'].includes(input.status))return {data:null,error:'Situação inválida.'};
 if(!['normal','high'].includes(input.priority))return {data:null,error:'Prioridade inválida.'};
 if(input.audience_type==='tier'&&!['Básico','Pro','Ultra'].includes(input.audience_tier||''))return {data:null,error:'Escolha um plano válido.'};
 if(input.audience_type==='user'&&(!input.audience_user_id||!uuid.test(input.audience_user_id)))return {data:null,error:'Escolha o cliente destinatário.'};
 if(!input.channel_site||input.channel_app||input.channel_push)return {data:null,error:'Nesta etapa o envio está habilitado somente no site. App e push dependem da atualização Android.'};
 const duration=input.validity_minutes;
 if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>10080))return {data:null,error:'Prazo de validade inválido.'};
 const label=String(input.cta_label||'').trim(),path=String(input.cta_path||'').trim();
 if(label.length<2||label.length>40||!validUrl(path))return {data:null,error:'Confira o texto e o destino do botão de abertura.'};
 let scheduled:string|null=null;
 if(input.status==='scheduled'){
  if(!input.scheduled_at)return {data:null,error:'Escolha a data e a hora do envio.'};
  const date=new Date(input.scheduled_at);
  if(!Number.isFinite(date.getTime())||date.getTime()<Date.now()+30000)
   return {data:null,error:'O horário do envio deve estar no futuro.'};
  scheduled=date.toISOString();
 }
 return {data:{
  title,body,category:input.category,audience_type:input.audience_type,
  audience_tier:input.audience_type==='tier'?input.audience_tier:null,
  audience_user_id:input.audience_type==='user'?input.audience_user_id:null,
  priority:input.priority,validity_minutes:duration,cta_label:label,cta_path:path,
  channel_site:true,channel_app:false,channel_push:false,
  status:input.status,scheduled_at:scheduled
 }};
}
export async function saveNotification(input:NotificationInput):Promise<NotificationResult>{
 const {sb,user}=await requireAdmin();
 const parsed=sanitize(input);if(!parsed.data)return {ok:false,message:parsed.error||'Dados inválidos.'};
 if(input.id&&!uuid.test(input.id))return {ok:false,message:'Identificador inválido.'};
 const changes={...parsed.data,updated_by:user.id,updated_at:new Date().toISOString()};
 let id=input.id;
 if(id){
  const {data,error}=await sb.from('aeromind_notification_campaigns')
   .update(changes).eq('id',id).in('status',['draft','scheduled','template']).select('id').maybeSingle();
  if(error||!data)return {ok:false,message:'Não foi possível alterar. Mensagens enviadas não podem ser editadas; duplique para reaproveitar.'};
 }else{
  const {data,error}=await sb.from('aeromind_notification_campaigns')
   .insert({...changes,created_by:user.id}).select('id').single();
  if(error||!data){console.error('notification_save_failure',error?.code);return {ok:false,message:'Erro ao salvar a notificação. Confira o público e tente novamente.'};}
  id=data.id;
 }
 revalidatePath('/admin/notificacoes');
 return {ok:true,id,message:input.status==='scheduled'?'Envio agendado.':input.status==='template'?'Modelo salvo.':'Rascunho salvo.'};
}
export async function sendSavedNotification(campaignId:string):Promise<NotificationResult>{
 const {sb}=await requireAdmin();
 if(!uuid.test(campaignId))return {ok:false,message:'Seleção inválida.'};
 const {data,error}=await sb.rpc('aeromind_admin_send_campaign',{p_campaign_id:campaignId});
 if(error||!Number.isInteger(data)||data<1){
  console.error('notification_publish_failure',error?.code);
  return {ok:false,message:error?.message?.includes('Nenhum destinatário')?'Não há destinatários elegíveis para esse público.':'Envio não realizado. Verifique o público e se a notificação já foi enviada.'};
 }
 revalidatePath('/admin/notificacoes');
 revalidatePath('/notificacoes');
 revalidatePath('/minha-conta');
 return {ok:true,id:campaignId,recipients:data,message:'Notificação entregue à caixa do site de '+data+' cliente(s).'};
}
export async function cancelScheduledNotification(campaignId:string):Promise<NotificationResult>{
 const {sb,user}=await requireAdmin();
 if(!uuid.test(campaignId))return {ok:false,message:'Seleção inválida.'};
 const {data,error}=await sb.from('aeromind_notification_campaigns')
  .update({status:'draft',scheduled_at:null,updated_at:new Date().toISOString(),updated_by:user.id})
  .eq('id',campaignId).eq('status','scheduled').select('id').maybeSingle();
 if(error||!data)return {ok:false,message:'Não foi possível cancelar. Pode já ter sido enviada.'};
 revalidatePath('/admin/notificacoes');
 return {ok:true,id:campaignId,message:'Agendamento cancelado. Notificação voltou aos rascunhos.'};
}
