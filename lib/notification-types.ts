export type NotificationCategory='radar'|'comunicado'|'atualizacao'|'licenca';
export type NotificationAudience='active'|'all'|'tier'|'user';
export type NotificationStatus='draft'|'template'|'scheduled'|'sent'|'cancelled';
export type NotificationPriority='normal'|'high';
export type NotificationCampaign={
 id:string; title:string;body:string;category:NotificationCategory;
 audience_type:NotificationAudience;audience_tier:string|null;audience_user_id:string|null;
 channel_site:boolean;channel_app:boolean;channel_push:boolean;
 priority:NotificationPriority;validity_minutes:number|null;
 cta_label:string;cta_path:string;status:NotificationStatus;
 scheduled_at:string|null;sent_at:string|null;recipient_count:number;
 created_at:string;updated_at:string;
};
export type NotificationInput={
 id?:string;title:string;body:string;category:NotificationCategory;
 audience_type:NotificationAudience;audience_tier:string|null;
 audience_user_id:string|null;priority:NotificationPriority;
 validity_minutes:number|null;cta_label:string;cta_path:string;
 status:'draft'|'template'|'scheduled';scheduled_at:string|null;
 channel_site:boolean;channel_app:boolean;channel_push:boolean;
};
export type NotificationResult={ok:boolean;message:string;id?:string;recipients?:number};
export const NOTIFICATION_CATEGORIES:Record<NotificationCategory,string>={
 radar:'Radar Ao Vivo',comunicado:'Comunicado',atualizacao:'Atualização',licenca:'Licença'
};
export const NOTIFICATION_STATUS:Record<NotificationStatus,string>={
 draft:'Rascunho',template:'Modelo',scheduled:'Agendada',sent:'Enviada',cancelled:'Cancelada'
};
export const DEFAULT_NOTIFICATION:NotificationInput={
 title:'',body:'',category:'radar',audience_type:'active',audience_tier:null,
 audience_user_id:null,channel_site:true,channel_app:false,channel_push:false,
 priority:'normal',validity_minutes:5,cta_label:'Abrir AeroMind',
 cta_path:'/minha-conta',status:'draft',scheduled_at:null
};
