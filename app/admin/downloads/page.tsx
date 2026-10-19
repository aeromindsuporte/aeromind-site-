import Link from 'next/link';import {redirect} from 'next/navigation';import {createClient} from '@/lib/supabase/server';import '../admin.css';
export const dynamic='force-dynamic';
type Download={user_id:string;email:string;version_name:string;requested_at:string};
export default async function Downloads(){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fadmin%2Fdownloads');
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();if(!staff)redirect('/minha-conta');
 const [r,s]=await Promise.all([sb.rpc('aeromind_admin_downloads'),sb.rpc('aeromind_admin_commercial_snapshot')]);
 const items=Array.isArray(r.data)?r.data as Download[]:[];const totals=(s.data||{}) as {requests_total?:number;download_accounts?:number;requests_7d?:number};
 return <main className="admin-root"><header className="admin-top"><Link className="admin-top-brand" href="/admin">← AeroMind <span>ADMIN</span></Link></header><div className="admin-content"><h1>Downloads do AeroMind</h1>
 <p className="admin-card-explain">Contamos links temporários emitidos para contas autenticadas. Isso não comprova instalação ou conclusão do download.</p>
 <div className="admin-stats">{[['Links emitidos',totals.requests_total],['Contas distintas',totals.download_accounts],['Últimos 7 dias',totals.requests_7d]].map(([name,n])=><div className="admin-stat purple" key={String(name)}><strong>{s.error?'—':Number(n)||0}</strong><span>{String(name)}</span></div>)}</div>
 {(r.error||s.error)&&<p className="admin-feedback bad">Algumas estatísticas estão indisponíveis.</p>}
 <section className="admin-card" style={{marginTop:26}}><h2>Últimos 200 links emitidos</h2><div className="admin-table-scroll"><table><thead><tr><th>Data</th><th>Conta</th><th>Versão</th><th>Ação</th></tr></thead><tbody>{items.map((d,i)=><tr key={d.user_id+d.requested_at+i}><td>{new Date(d.requested_at).toLocaleString('pt-BR')}</td><td className="admin-email">{d.email}</td><td>{d.version_name}</td><td><Link className="admin-inline-action" href={'/admin/clientes/'+d.user_id}>Gerenciar →</Link></td></tr>)}{!items.length&&<tr><td colSpan={4}>Nenhum link emitido até agora.</td></tr>}</tbody></table></div></section></div></main>;
}