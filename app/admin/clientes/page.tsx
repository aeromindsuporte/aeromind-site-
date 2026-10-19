import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
export const dynamic='force-dynamic';
type Client={id:string,email:string,display_name:string|null,created_at:string,confirmed:boolean};
export default async function Clients({searchParams}:{searchParams:Promise<{q?:string,page?:string}>}){
 const {sb}=await requireAdmin();const {q,page}=await searchParams;
 const n=Math.max(1,Math.min(2000,Number.parseInt(page||'1',10)||1));
 const term=String(q||'').trim().toLowerCase().slice(0,100);
 const {data,error}=await sb.rpc('aeromind_admin_search_customers',{p_query:term,p_offset:(n-1)*50});
 const filtered=((data?.users||[]) as Client[]),total=Number(data?.total||0);
 return <CommercialAdminShell active="/admin/clientes" title="Clientes" description="Selecione um cliente para abrir a gestão direta de licenças, dispositivos e histórico.">
 <section className="admin-card"><form action="/admin/clientes" method="get" className="admin-edit-grid"><label>Buscar cliente<input name="q" placeholder="E-mail ou nome" defaultValue={term}/></label><div className="admin-form-foot"><button>Buscar</button></div></form>
 {error?<p className="admin-feedback bad">Não foi possível carregar clientes.</p>:<div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>E-mail</th><th>Conta</th><th>Ação</th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td>{c.display_name||'Cliente AeroMind'}</td><td className="admin-email">{c.email}</td><td>{c.confirmed?'Confirmada':'Pendente'}</td><td><Link className="admin-inline-action" href={'/admin/cliente/'+c.id}>Gerenciar →</Link></td></tr>)}{!filtered.length&&<tr><td colSpan={4}>Nenhum cadastro encontrado.</td></tr>}</tbody></table></div>}
 <p className="admin-card-explain">Página {n} · {total} cliente(s) encontrados</p>
 <div style={{display:'flex',gap:14,marginTop:13}}>{n>1&&<Link className="admin-inline-action" href={'/admin/clientes?q='+encodeURIComponent(term)+'&page='+(n-1)}>← Anterior</Link>}
 {n*50<total&&<Link className="admin-inline-action" href={'/admin/clientes?q='+encodeURIComponent(term)+'&page='+(n+1)}>Próxima →</Link>}</div></section></CommercialAdminShell>;
}
