import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {markUserNotificationRead,markAllUserNotificationsRead} from './actions';
import {NotificationList,type NotificationItem} from '@/components/account/NotificationList';
import {NotificationsAutoRefresh} from '@/components/account/NotificationsAutoRefresh';
import './notifications.css';
export const dynamic='force-dynamic';
export const metadata={title:'Minhas notificações | AeroMind',robots:{index:false,follow:false}};
export default async function NotificationsInbox({searchParams}:{searchParams:Promise<{erro?:string;filtro?:string}>}){
 const sb=await createClient();const {data:{user},error:userError}=await sb.auth.getUser();
 if(userError||!user)redirect('/entrar?next=%2Fnotificacoes');
 const {erro,filtro}=await searchParams;
 const result=await sb.from('aeromind_notification_deliveries').select('id,title,body,category,priority,published_at,expires_at,read_at,cta_label,cta_path').eq('user_id',user.id).order('published_at',{ascending:false}).limit(150);
 const items=(result.data||[]) as NotificationItem[];const now=Date.now();
 const unread=items.filter(n=>!n.read_at&&(!n.expires_at||new Date(n.expires_at).getTime()>now)).length;
 const categories=[{key:'radar',name:'Radar'},{key:'comunicado',name:'Comunicados'},{key:'atualizacao',name:'Atualizações'},{key:'licenca',name:'Licenças'}];
 return <main className="account-root ni-page"><NotificationsAutoRefresh/>
  <header className="account-header"><Link href="/minha-conta" className="auth-logo">← AeroMind</Link><Link href="/minha-conta" className="auth-secondary">Minha conta →</Link></header>
  <div className="account-container ni-container">
   <span className="auth-eyebrow">♧ COMUNICAÇÃO AEROMIND</span><h1>Minhas <em>notificações</em></h1>
   <p className="account-lead">Comunicados, atualizações e observações do Radar Ao Vivo em um só lugar.</p>
   <div className="ni-stats"><div><small>Mensagens recebidas</small><strong>{items.length}</strong></div><div><small>Não lidas e válidas</small><strong>{unread}</strong></div></div>
   <div className="ni-category-summary">{categories.map(c=><div key={c.key}><span>{c.name}</span><strong>{items.filter(n=>n.category===c.key&&!n.read_at&&(!n.expires_at||new Date(n.expires_at).getTime()>now)).length}</strong></div>)}</div>
   {unread>0&&<form action={markAllUserNotificationsRead} className="ni-mark-all"><button type="submit">✓ Marcar todas como lidas ({unread})</button></form>}
   {erro&&<p role="alert" className="ni-error">Não foi possível salvar a leitura. Tente novamente.</p>}
   {result.error?<p role="alert" className="ni-error">Não foi possível carregar as notificações agora.</p>:<NotificationList items={items} markRead={markUserNotificationRead} initialFilter={filtro}/>}
   <p className="ni-footer-note">Os alertas são enviados pelo site. Para receber notificações no aplicativo fechado, será necessária uma atualização Android com suporte específico a notificações remotas.</p>
  </div></main>;
}
