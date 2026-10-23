import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {markUserNotificationRead} from './actions';
import {NotificationsAutoRefresh} from '@/components/account/NotificationsAutoRefresh';
import './notifications.css';
export const dynamic='force-dynamic';
export const metadata={title:'Minhas notificações | AeroMind',robots:{index:false,follow:false}};
type Notice={id:string;title:string;body:string;category:string;priority:string;
 published_at:string;expires_at:string|null;read_at:string|null;cta_label:string;cta_path:string};
const when=(date:string)=>new Date(date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
const label:Record<string,string>={radar:'Radar Ao Vivo',comunicado:'Comunicado',atualizacao:'Atualização',licenca:'Licença'};
export default async function NotificationsInbox({searchParams}:{searchParams:Promise<{erro?:string;filtro?:string}>}){
 const sb=await createClient();
 const {data:{user},error:userError}=await sb.auth.getUser();
 if(userError||!user)redirect('/entrar?next=%2Fnotificacoes');
 const {erro,filtro}=await searchParams;
 const result=await sb.from('aeromind_notification_deliveries')
  .select('id,title,body,category,priority,published_at,expires_at,read_at,cta_label,cta_path')
  .eq('user_id',user.id).order('published_at',{ascending:false}).limit(150);
 const items=(result.data||[]) as Notice[];
 const now=Date.now();
 const unread=items.filter(n=>!n.read_at&&(!n.expires_at||new Date(n.expires_at).getTime()>now)).length;
 const filtered=filtro==='nao-lidas'?items.filter(n=>!n.read_at&&(!n.expires_at||new Date(n.expires_at).getTime()>now)):items;
 return <main className="account-root ni-page">
  <NotificationsAutoRefresh/>
  <header className="account-header"><Link href="/minha-conta" className="auth-logo">← AeroMind</Link>
   <Link href="/minha-conta" className="auth-secondary">Minha conta →</Link></header>
  <div className="account-container ni-container">
   <span className="auth-eyebrow">♧ COMUNICAÇÃO AEROMIND</span>
   <h1>Minhas <em>notificações</em></h1>
   <p className="account-lead">Receba comunicados, atualizações e observações do Radar Ao Vivo.</p>
   <div className="ni-stats">
    <div><small>Mensagens recebidas</small><strong>{items.length}</strong></div>
    <div><small>Não lidas e válidas</small><strong>{unread}</strong></div>
   </div>
   <nav className="ni-filters" aria-label="Filtrar mensagens">
     <Link className={filtro==='nao-lidas'?'':'active'} href="/notificacoes">Todas</Link>
     <Link className={filtro==='nao-lidas'?'active':''} href="/notificacoes?filtro=nao-lidas">Não lidas</Link>
   </nav>
   {erro&&<p role="alert" className="ni-error">Não foi possível marcar como lida. Tente novamente.</p>}
   {result.error&&<p role="alert" className="ni-error">Não foi possível carregar as notificações agora.</p>}
   {!result.error&&<div className="ni-list">
    {filtered.map(n=>{
      const expired=!!n.expires_at&&new Date(n.expires_at).getTime()<=now;
      return <article className={'ni-card'+(!n.read_at&&!expired?' ni-unread':'')} key={n.id}>
       <div className="ni-top"><span className="ni-category">{label[n.category]||'AeroMind'}</span>
        <span className={'ni-state'+(expired?' expired':'')}>
         {expired?'Expirada':n.read_at?'Lida':'Nova'}</span></div>
       <h2>{n.title}</h2><p>{n.body}</p>
       {n.category==='radar'&&<p className="ni-caution">Observação informativa: não é garantia de resultado.</p>}
       <small>Enviada em {when(n.published_at)}{n.expires_at?' · Válida até '+when(n.expires_at):''}</small>
       <div className="ni-actions">
        {!n.read_at&&<form action={markUserNotificationRead}>
          <input name="id" type="hidden" value={n.id}/><button type="submit">✓ Marcar como lida</button>
        </form>}
        {!expired&&<Link href={n.cta_path||'/minha-conta'} className="ni-go">{n.cta_label} ↗</Link>}
       </div>
      </article>;
     })}
     {!filtered.length&&<div className="ni-empty"><span>♧</span><strong>Nenhuma notificação por aqui.</strong>
       <p>Os avisos publicados para sua conta aparecerão neste espaço.</p></div>}
   </div>}
   <p className="ni-footer-note">Os alertas são enviados pelo site. Para receber notificações no aplicativo fechado, será necessária uma futura atualização Android.</p>
  </div>
 </main>;
}
