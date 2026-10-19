import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {saveCoupon,toggleCoupon} from '@/app/admin/actions';
export const dynamic='force-dynamic';
type Coupon={code:string,discount_percent:number,active:boolean,max_uses:number|null,expires_at:string|null};
export default async function Coupons({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {sb}=await requireAdmin();
 const {data,error}=await sb.from('aeromind_coupons').select('code,discount_percent,active,max_uses,expires_at').order('created_at',{ascending:false}).limit(100);
 const {msg}=await searchParams;
 return <CommercialAdminShell active="/admin/cupons" title="Cupons de desconto" description="Cadastre descontos com prazo e limite de utilizações. Valem no checkout após homologação.">
 {msg&&<p className={'admin-feedback '+(msg==='coupon-saved'?'good':'bad')}>{msg==='coupon-saved'?'Cupom atualizado.':'Falha ao salvar cupom. Confira código e valores.'}</p>}
 <section className="admin-card"><h2>Criar ou editar cupom</h2><p className="admin-card-explain">Para editar, informe o mesmo código de um cupom existente.</p>
 <form action={saveCoupon} className="admin-edit-grid">
 <label>Código<input name="code" minLength={4} maxLength={32} pattern="[A-Za-z0-9_-]{4,32}" required placeholder="AERO20"/></label>
 <label>Desconto (%)<input type="number" min="1" max="90" name="discount" required defaultValue={10}/></label>
 <label>Limite de usos<input type="number" name="max_uses" min="1" placeholder="Ilimitado"/></label>
 <label>Validade<input type="date" name="expires_at"/></label>
 <label className="admin-checkbox"><input type="checkbox" name="active" defaultChecked/> Cupom ativo</label>
 <div className="admin-form-foot"><button>Salvar cupom</button></div></form></section>
 <section className="admin-card" style={{marginTop:16}}><h2>Cupons cadastrados</h2>
 {error?<p className="admin-feedback bad">Erro ao consultar cupons.</p>:<div className="admin-table-scroll"><table><thead><tr><th>Código</th><th>Desconto</th><th>Validade</th><th>Limite</th><th>Status</th><th>Ação</th></tr></thead><tbody>
 {((data||[]) as Coupon[]).map(c=><tr key={c.code}><td>{c.code}</td><td>{c.discount_percent}%</td><td>{c.expires_at?new Date(c.expires_at).toLocaleDateString('pt-BR'):'Livre'}</td><td>{c.max_uses??'Livre'}</td><td>{c.active?'Ativo':'Inativo'}</td><td><form action={toggleCoupon}><input type="hidden" name="code" value={c.code}/><input type="hidden" name="active" value={c.active?'false':'true'}/><button className="admin-inline-action">{c.active?'Desativar':'Ativar'}</button></form></td></tr>)}
 {!data?.length&&<tr><td colSpan={6}>Nenhum cupom cadastrado.</td></tr>}</tbody></table></div>}</section>
 </CommercialAdminShell>;
}
