import Link from 'next/link';import {redirect} from 'next/navigation';import {createClient} from '@/lib/supabase/server';import {saveCoupon,setCouponStatus} from './actions';import '../admin.css';
export const dynamic='force-dynamic';
type Coupon={code:string;discount_percent:number;active:boolean;max_uses:number|null;expires_at:string|null;created_at:string};
export default async function Coupons({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fadmin%2Fcupons');
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();if(!staff)redirect('/minha-conta');
 const {data,error}=await sb.from('aeromind_coupons').select('code,discount_percent,active,max_uses,expires_at,created_at').order('created_at',{ascending:false}).limit(100);
 const coupons=(data||[]) as Coupon[];const {msg}=await searchParams;
 return <main className="admin-root"><header className="admin-top"><Link className="admin-top-brand" href="/admin">← AeroMind <span>ADMIN</span></Link></header><div className="admin-content"><h1>Cupons promocionais</h1>
 <p className="admin-card-explain">Cadastre ou altere cupons. Eles serão considerados no checkout quando a cobrança for homologada. Nenhum pagamento de produção é ativado aqui.</p>
 {msg&&<p className={'admin-feedback '+(msg==='saved'?'good':'bad')}>{msg==='saved'?'Cupom atualizado.':'Não foi possível salvar; confira os dados e permissões.'}</p>}
 {error&&<p className="admin-feedback bad">Não foi possível listar os cupons.</p>}
 <section className="admin-card"><h2>Cadastrar ou editar cupom</h2><form action={saveCoupon} className="admin-edit-grid">
 <label>Código (4 a 24 letras/números)<input name="code" pattern="[A-Za-z0-9_-]{4,24}" maxLength={24} required placeholder="EXEMPLO10"/></label>
 <label>Desconto (%)<input name="discount_percent" type="number" min={1} max={90} defaultValue={10} required/></label>
 <label>Limite de utilização (opcional)<input name="max_uses" type="number" min={1} max={100000} placeholder="Sem limite"/></label>
 <label>Validade final (opcional)<input name="expires_at" type="date"/></label>
 <label className="admin-checkbox"><input name="active" type="checkbox" defaultChecked/>Cupom ativo</label>
 <div className="admin-form-foot"><small>Para editar, informe o mesmo código. A edição atualiza as condições para usos futuros.</small><button type="submit">Salvar cupom →</button></div></form></section>
 <section className="admin-card" style={{marginTop:24}}><h2>Cupons cadastrados</h2><div className="admin-table-scroll"><table><thead><tr><th>Código</th><th>Desconto</th><th>Máximo</th><th>Válido até</th><th>Situação</th><th>Ação</th></tr></thead><tbody>
 {coupons.map(c=><tr key={c.code}><td><strong>{c.code}</strong></td><td>{c.discount_percent}%</td><td>{c.max_uses??'Sem limite'}</td><td>{c.expires_at?new Date(c.expires_at).toLocaleDateString('pt-BR'):'Sem prazo'}</td><td>{c.active?'Ativo':'Inativo'}</td><td><form action={setCouponStatus}><input type="hidden" name="code" value={c.code}/><input type="hidden" name="active" value={c.active?'false':'true'}/><button className="admin-inline-action" type="submit">{c.active?'Desativar':'Reativar'}</button></form></td></tr>)}
 {!coupons.length&&<tr><td colSpan={6}>Nenhum cupom cadastrado.</td></tr>}</tbody></table></div></section>
 </div></main>;
}