import Link from 'next/link';
import type {ReactNode} from 'react';
import '@/app/admin/admin.css';
const nav=[['/admin','Visão geral'],['/admin/clientes','Clientes'],['/admin/licencas','Licenças'],['/admin/planos','Planos'],['/admin/dispositivos','Dispositivos'],['/admin/releases','Atualizações'],['/admin/downloads','Downloads'],['/admin/cupons','Cupons'],['/admin/pagamentos','Pagamentos'],['/admin/relatorios','Relatórios'],['/admin/suporte','Suporte']];
export function CommercialAdminShell({title,active,children,description}:{title:string,active:string,description:string,children:ReactNode}){
return <div className="admin-root"><header className="admin-top"><Link href="/admin" className="admin-top-brand">◈ AeroMind <span>ADMIN</span></Link><Link href="/minha-conta" className="admin-account-link">Minha conta ↗</Link></header>
<div className="admin-shell"><aside className="admin-sidebar"><p>GERENCIAMENTO</p><nav>{nav.map(([href,label])=><Link key={href} href={href} className={active===href?'current':''}>{label}</Link>)}</nav></aside>
<main className="admin-content"><div className="admin-title-row"><div><span className="admin-eyebrow">PAINEL ADMINISTRATIVO</span><h1>{title}</h1><p>{description}</p></div></div>{children}</main></div></div>;
}
