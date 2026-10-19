import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {saveLicense,saveDeviceLimit} from '@/app/admin/actions';
import '../../../admin.css';
export const dynamic='force-dynamic';
type License={id:string;plan_name:string;status:string;valid_until:string|null;max_devices:number;created_at:string};
type Device={id:string;device_name:string;status:string;last_seen_at:string|null};
type Person={id:string;email:string;display_name:string|null;confirmed:boolean;created_at:string;licenses:License[];devices:Device[];requests_total:number;tickets_total:number;orders_total:number};
export default async function Customer({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))notFound();
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/entrar?next=%2Fadmin%2Fclientes');const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
 if(!staff)redirect('/minha-conta');
 const {data,error}=await sb.rpc('aeromind_admin_customer',{p_user_id:id});
 if(error)throw new Error('Falha ao carregar cliente');if(!data)notFound();
 const c=data as Person;const licenses=Array.isArray(c.licenses)?c.licenses:[];const devices=Array.isArray(c.devices)?c.devices:[];
 const latest=licenses[0];const date=(raw:string|null)=>raw?new Date(raw).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
 return <main className="admin-root"><header className="admin-top"><Link className="admin-top-brand" href="/admin/clientes">← Clientes <span>ADMIN</span></Link></header><div className="admin-content">
 <span className="admin-eyebrow">FICHA DO CLIENTE</span><h1>{c.display_name||'Cliente AeroMind'}</h1><p className="admin-card-explain">{c.email} · {c.confirmed?'E-mail confirmado':'E-mail pendente'} · cadastrado em {date(c.created_at)}</p>
 <div className="admin-stats"><div className="admin-stat purple"><strong>{licenses.length}</strong><span>Licenças recentes</span></div><div className="admin-stat green"><strong>{c.requests_total}</strong><span>Links de download emitidos</span></div><div className="admin-stat blue"><strong>{c.orders_total}</strong><span>Pedidos</span></div><div className="admin-stat yellow"><strong>{c.tickets_total}</strong><span>Chamados</span></div></div>
 <section className="admin-card" style={{marginTop:28}}><h2>Gerenciar a licença deste cliente</h2><form action={saveLicense} className="admin-edit-grid">
 <input type="hidden" name="email" value={c.email}/><input type="hidden" name="return_customer" value={c.id}/>
 <label>Plano<select name="tier" defaultValue={latest?.plan_name||'Pro'}><option>Básico</option><option>Pro</option><option>Ultra</option></select></label>
 <label>Status<select name="status" defaultValue={latest?.status||'pending'}><option value="pending">Pendente</option><option value="active">Ativa</option><option value="expired">Expirada</option><option value="suspended">Suspensa</option><option value="revoked">Revogada</option></select></label>
 <label>Validade<input type="date" name="valid_until" defaultValue={latest?.valid_until?.slice(0,10)||''}/></label>
 <label className="admin-full">Motivo / observação interna<textarea name="note" rows={2} maxLength={500}/></label>
 <div className="admin-form-foot"><small>Alterações de licença auditadas no servidor.</small><button type="submit">Salvar licença →</button></div></form>
 <h3>Limite de dispositivos</h3><form action={saveDeviceLimit} className="admin-edit-grid"><input type="hidden" name="email" value={c.email}/><input type="hidden" name="return_customer" value={c.id}/><label>Dispositivos permitidos<input name="max_devices" type="number" min={1} max={20} required defaultValue={latest?.max_devices||2}/></label><div className="admin-form-foot"><button type="submit">Atualizar limite →</button></div></form></section>
 <section className="admin-card" style={{marginTop:24}}><h2>Histórico de licenças</h2><div className="admin-table-scroll"><table><thead><tr><th>Plano</th><th>Status</th><th>Validade</th><th>Dispositivos</th></tr></thead><tbody>{licenses.map(l=><tr key={l.id}><td>{l.plan_name}</td><td>{l.status}</td><td>{date(l.valid_until)}</td><td>{l.max_devices}</td></tr>)}{!licenses.length&&<tr><td colSpan={4}>Nenhuma licença</td></tr>}</tbody></table></div></section>
 <section className="admin-card" style={{marginTop:24}}><h2>Aparelhos vinculados</h2><div className="admin-table-scroll"><table><thead><tr><th>Aparelho</th><th>Situação</th><th>Último acesso</th></tr></thead><tbody>{devices.map(d=><tr key={d.id}><td>{d.device_name}</td><td>{d.status}</td><td>{date(d.last_seen_at)}</td></tr>)}{!devices.length&&<tr><td colSpan={3}>Nenhum aparelho registrado</td></tr>}</tbody></table></div></section>
 <p style={{marginTop:24}}><Link href="/admin/clientes" className="admin-inline-action">← Voltar aos clientes</Link></p>
 </div></main>;
}