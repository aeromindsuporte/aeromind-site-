import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {saveCatalogPlan,savePlanPresentation} from '@/app/admin/actions';
export const dynamic='force-dynamic';
type Plan={slug:string,tier:string,duration_days:number,price_cents:number|null,visible:boolean,marketing_title:string|null,marketing_description:string|null,marketing_badge:string|null,marketing_features:string[]|null,marketing_cta:string|null,marketing_highlight:boolean};
export default async function AdminPlans({searchParams}:{searchParams:Promise<{msg?:string}>}){
 const {sb}=await requireAdmin(),{msg}=await searchParams;
 const {data,error}=await sb.rpc('aeromind_admin_all_plans');
 const plans=(Array.isArray(data)?data:[]) as Plan[];
 return <CommercialAdminShell title="Planos e divulgação" active="/admin/planos" description="Personalize preço, título, vantagens e destaque de cada card. Alterações refletem na página de vendas.">
 {msg&&<p className={'admin-feedback '+(msg==='plan-saved'?'good':'bad')}>{msg==='plan-saved'?'Alterações salvas. Consulte a página pública.':'Falha ao salvar. Verifique os dados.'}</p>}
 <p><a className="admin-inline-action" href="/planos" target="_blank" rel="noreferrer">Ver página de vendas ↗</a></p>
 {error&&<p className="admin-feedback bad">Falha ao consultar planos.</p>}
 <div className="admin-catalog-grid">{plans.map(p=><section className="admin-plan-item" key={p.slug}>
 <h2>{p.tier} · {p.duration_days} dias</h2>
 <form action={saveCatalogPlan} className="admin-edit-grid" style={{display:'grid',gridTemplateColumns:'1fr',gap:12}}>
 <input type="hidden" name="slug" value={p.slug}/>
 <label>Preço (R$)<input type="number" name="price" min="0" step="0.01" defaultValue={p.price_cents===null?'':(p.price_cents/100).toFixed(2)}/></label>
 <label className="admin-checkbox"><input type="checkbox" name="visible" defaultChecked={p.visible}/>Exibir na página de planos</label>
 <button>Salvar preço e visibilidade</button></form>
 <form action={savePlanPresentation} className="admin-edit-grid" style={{display:'grid',gridTemplateColumns:'1fr',gap:12,marginTop:18,borderTop:'1px solid #394579',paddingTop:18}}>
 <input type="hidden" name="slug" value={p.slug}/>
 <label>Título<input name="title" maxLength={65} defaultValue={p.marketing_title||''} placeholder={p.tier}/></label>
 <label>Descrição<input name="description" maxLength={240} defaultValue={p.marketing_description||''}/></label>
 <label>Selo<input name="badge" maxLength={38} defaultValue={p.marketing_badge||''} placeholder="Mais popular"/></label>
 <label>Benefícios (até 8, um por linha)<textarea name="features" rows={5} defaultValue={(p.marketing_features||[]).join('\n')}/></label>
 <label>Texto do botão<input name="cta" maxLength={40} defaultValue={p.marketing_cta||''} placeholder="Escolher plano"/></label>
 <label className="admin-checkbox"><input type="checkbox" name="highlight" defaultChecked={!!p.marketing_highlight}/>Destacar card</label>
 <button>Salvar divulgação do plano</button></form>
 </section>)}</div></CommercialAdminShell>;
}
