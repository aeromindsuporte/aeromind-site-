import Link from 'next/link';
import type {ReactNode} from 'react';
import '@/app/admin/admin.css';
import {createClient} from '@/lib/supabase/server';
import {AdminMenuToggle} from './AdminMenuToggle';
import {AdminAlertsRefresh} from './AdminAlertsRefresh';
import {SupportUnreadBadge} from './SupportUnreadBadge';
const nav=[
 ['/admin','Visão geral','▦'],
 ['/admin/clientes','Clientes','♙'],
 ['/admin/licencas','Licenças','⚿'],
 ['/admin/planos','Planos','◈'],
 ['/admin/divulgacao','Divulgação Pro e Gold','✧'],
 ['/admin/gold','Gold (preparação)','✦'],
 ['/admin/dispositivos','Dispositivos','▯'],
 ['/admin/presenca','Clientes online','◉'],
 ['/admin/movimentacoes','Movimentações','⇄'],
 ['/admin/notificacoes','Central de Notificações','🔔'],
 ['/admin/releases','Atualizações','⇧'],
 ['/admin/downloads','Downloads','⇩'],
 ['/admin/cupons','Cupons','◇'],
 ['/admin/pagamentos','Pagamentos','▣'],
 ['/admin/relatorios','Relatórios','▥'],
 ['/admin/suporte','Suporte','✉']
] as const;
async function DevicePendingCount(){
 const sb=await createClient();
 const {count,error}=await sb.from('aeromind_device_activity').select('id',{count:'exact',head:true}).is('reviewed_at',null);
 return !error&&count&&count>0?<span className="admin-alert-badge" aria-label={count+' alertas de aparelhos não verificados'}>{count>99?'99+':count}</span>:null;
}
export function CommercialAdminShell({title,active,children,description}:{title:string,active:string,description:string,children:ReactNode}){
return <div className="admin-root admin-commercial">
 {active!=='/admin/notificacoes'&&<AdminAlertsRefresh/>}
 <header className="admin-top">
  <AdminMenuToggle/>
  <Link href="/admin" className="admin-top-brand"><img src="/images/aeromind-mark.svg" width="36" height="36" alt=""/> AeroMind <span>ADMIN</span></Link>
  <div className="admin-top-actions">
   <Link className="admin-notification-bell" href="/admin/notificacoes" aria-label="Abrir Central de Notificações">🔔</Link>
   <Link href="/admin/suporte" className="admin-account-link" aria-label="Abrir mensagens do suporte">✉ Suporte <SupportUnreadBadge/></Link>
   <Link href="/minha-conta" className="admin-account-link">Minha conta ↗</Link>
  </div>
 </header>
 <div className="admin-shell">
  <aside id="admin-navigation" className="admin-sidebar" aria-label="Menu administrativo">
   <div className="admin-sidebar-heading"><p>GERENCIAMENTO</p><button type="button" className="admin-sidebar-close" aria-label="Fechar menu">×</button></div>
   <nav aria-label="Todas as funções administrativas">
    {nav.map(([href,label,icon])=><Link key={href} href={href} className={active===href?'current':''} aria-current={active===href?'page':undefined}>
     <span className="admin-nav-icon" aria-hidden="true">{icon}</span>{label}
     {href==='/admin/movimentacoes'&&<DevicePendingCount/>}
     {href==='/admin/suporte'&&<SupportUnreadBadge/>}
    </Link>)}
   </nav>
   <div className="admin-sidebar-foot"><span>Site e suporte</span><Link href="/">↗ Ver site</Link><Link href="/minha-conta">◀ Minha conta</Link></div>
  </aside>
  <main className="admin-content">
   <div className="admin-title-row"><div><span className="admin-eyebrow">PAINEL ADMINISTRATIVO</span><h1>{title}</h1><p>{description}</p></div></div>
   {children}
  </main>
 </div>
</div>;
}
