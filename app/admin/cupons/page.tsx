import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {saveCoupon,toggleCoupon} from '@/app/admin/actions';
export const dynamic='force-dynamic';
type Coupon={code:string,discount_percent:number,active:boolean,max_uses:number|null,expires_at:string|null};
export default async function Coupons({searchParams}:{searchParams:Promise<{msg?:string;edit?:string}>}){
 const {sb}=await requireAdmin();
 const {data,error}=await sb.from('aeromind_coupons').select('code,discount_percent,active,max_uses,expires_at').order('created_at',{ascending:false}).limit(100);
 const {msg,edit}=await searchParams;
 const coupons=((data||[]) as Coupon[]);
 const selected=coupons.find(c=>c.code===String(edit||'').trim().toUpperCase());
 const dateOnly=(iso:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date(iso));
 return <CommercialAdminShell active="/admin/cupons" title="Cupons de desconto" description="Cadastre descontos com prazo e limite de utilizações. Valem no checkout após homologação.">
 {msg&&<p className={'admin-feedback '+(msg==='coupon-saved'?'good':'bad')}>{msg==='coupon-saved'?'Cupom atualizado.':'Falha ao salvar cupom. Confira código e valores.'}</p>}
 <section className="admin-card"><h2>{selected?'Editar cupom '+selected.code:'Criar novo cupom'}</h2><p className="admin-card-explain">{selected?'Confira os dados cadastrados antes de salvar. O código permanece fixo.':'Configure o desconto, a validade e o limite de utilizações.'}</p>
 <form action={saveCoupon} className="admin-edit-grid">
 <label>Código<input name="code" minLength={4} maxLength={24} pattern="[A-Za-z0-9_-]{4,24}" required placeholder="AERO20" defaultValue={selected?.code||''} readOnly={!!selected}/></label>
 <label>Desconto (%)<input type="number" min="1" max="90" name="discount" required defaultValue={selected?.discount_percent??10}/></label>
 <label>Limite de usos<input type="number" name="max_uses" min="1" placeholder="Ilimitado" defaultValue={selected?.max_uses??""}/></label>
 <label>Validade<input type="date" name="expires_at" defaultValue={selected?.expires_at?dateOnly(selected.expires_at):""}/></label>
 <label className="admin-checkbox"><input type="checkbox" name="active" defaultChecked={selected?.active??true}/> Cupom ativo</label>
 <div className="admin-form-foot"><button>{selected?"Salvar alterações":"Criar cupom"}</button>{selected&&<Link className="admin-inline-action" href="/admin/cupons">Cancelar edição</Link>}</div></form></section>
 <section className="admin-card" style={{marginTop:16}}><h2>Cupons cadastrados</h2>
 {error?<p className="admin-feedback bad">Erro ao consultar cupons.</p>:<div className="admin-table-scroll"><table><thead><tr><th>Código</th><th>Desconto</th><th>Validade</th><th>Limite</th><th>Status</th><th>Ação</th></tr></thead><tbody>
 {coupons.map(c=><tr key={c.code}><td>{c.code}</td><td>{c.discount_percent}%</td><td>{c.expires_at?new Date(c.expires_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Livre'}</td><td>{c.max_uses??'Livre'}</td><td>{c.active?'Ativo':'Inativo'}</td><td><div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}><Link className="admin-inline-action" href={"/admin/cupons?edit="+encodeURIComponent(c.code)}>Editar</Link><form action={toggleCoupon}><input type="hidden" name="code" value={c.code}/><input type="hidden" name="active" value={c.active?'false':'true'}/><button className="admin-inline-action">{c.active?'Desativar':'Ativar'}</button></form></div></td></tr>)}
 {!data?.length&&<tr><td colSpan={6}>Nenhum cupom cadastrado.</td></tr>}</tbody></table></div>}</section>
 </CommercialAdminShell>;
}
