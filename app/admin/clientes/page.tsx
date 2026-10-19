import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import '../../admin/admin.css';
export const dynamic='force-dynamic';
type Person={id:string;email:string;display_name:string|null;created_at:string;confirmed:boolean};
export default async function Clients({searchParams}:{searchParams:Promise<{busca?:string;pagina?:string}>}){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/entrar?next=%2Fadmin%2Fclientes');
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
 if(!staff)redirect('/minha-conta');
 const params=await searchParams;const busca=(params.busca||'').trim().slice(0,100);
 const pagina=Math.max(0,Math.min(2000,Number.parseInt(params.pagina||'0',10)||0));
 const {data,error}=await sb.rpc('aeromind_admin_search_customers',{p_query:busca,p_offset:pagina*50});
 const results=(data||{}) as {total?:number;users?:Person[]};
 const users=Array.isArray(results.users)?results.users:[];const total=Number(results.total)||0;
 const href=(p:number)=>'/admin/clientes?busca='+encodeURIComponent(busca)+'&pagina='+p;
 return <main className="admin-root"><header className="admin-top"><Link className="admin-top-brand" href="/admin">← AeroMind <span>ADMIN</span></Link></header><div className="admin-content">
 <span className="admin-eyebrow">GERENCIAMENTO DE CONTAS</span><h1>Clientes</h1><p className="admin-card-explain">Pesquise e abra diretamente a ficha de qualquer cliente.</p>
 <form method="get" className="admin-edit-grid" style={{marginBottom:24}}><label>Nome ou e-mail<input name="busca" defaultValue={busca} maxLength={100} placeholder="Buscar cliente"/></label><div className="admin-form-foot"><button type="submit">Buscar →</button></div></form>
 {error&&<p className="admin-feedback bad">Não foi possível carregar a lista.</p>}
 <section className="admin-card"><h2>{total} cliente(s) encontrado(s)</h2><div className="admin-table-scroll"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Cadastro</th><th>Situação</th><th>Gerenciar</th></tr></thead><tbody>
 {users.map(u=><tr key={u.id}><td>{u.display_name||'Cliente AeroMind'}</td><td className="admin-email">{u.email}</td><td>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td><td>{u.confirmed?'Confirmado':'Pendente'}</td><td><Link className="admin-inline-action" href={'/admin/clientes/'+u.id}>Gerenciar →</Link></td></tr>)}
 {!users.length&&<tr><td colSpan={5}>Nenhum cliente encontrado.</td></tr>}
 </tbody></table></div><div style={{display:'flex',gap:18,marginTop:22}}>{pagina>0&&<Link className="admin-inline-action" href={href(pagina-1)}>← Anterior</Link>}{(pagina+1)*50<total&&<Link className="admin-inline-action" href={href(pagina+1)}>Próxima →</Link>}</div></section></div></main>;
}