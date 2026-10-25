import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {CampaignCopyButton} from '@/components/admin/CampaignCopyButton';
import {saveTierCampaign} from './actions';
import type {Campaign} from '@/lib/campaigns';
import './marketing.css';
export const dynamic='force-dynamic';
export const metadata={title:'Campanhas Pro e Gold | AeroMind Admin',robots:{index:false,follow:false}};

type Plan={slug:string;tier:string;duration_days:number;price_cents:number|null;visible:boolean};
type Audit={id:number;tier:string;created_at:string;reason:string};
const message:Record<string,string>={
 saved:'Campanha atualizada e registrada no histórico. A vitrine pública exibirá os novos textos quando estiver publicada.',
 invalid:'Revise os campos: 2 a 6 benefícios, título, descrição, selo e justificativa são obrigatórios.',
 permission:'Sua conta não tem permissão para alterar a divulgação.',
 error:'O banco não confirmou o salvamento. Nenhum texto foi alterado.'
};
const fmt=(s:string)=>new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
function PlanReadiness({plans}:{plans:Plan[]}){
 const periods=[{d:30,name:'Mensal'},{d:90,name:'Trimestral'},{d:180,name:'Semestral'},{d:365,name:'Anual'}];
 return <div className="mc-readiness">{periods.map(item=>{
  const p=plans.find(x=>x.tier==='Pro'&&x.duration_days===item.d&&x.slug.startsWith('pro-'));
  const ready=!!p&&p.visible&&Number(p.price_cents)>=200;
  return <div key={item.d}><strong>{item.name}</strong><span className={ready?'mc-ready':'mc-wait'}>{ready?'Publicado com preço':p?.price_cents!=null?'Oculto / revisar publicação':'Sem preço e oculto'}</span></div>;
 })}</div>;
}
export default async function AdminMarketing({searchParams}:{searchParams:Promise<{tier?:string;msg?:string}>}){
 const {sb,role}=await requireAdmin();
 if(!['admin','owner'].includes(role))redirect('/admin');
 const params=await searchParams;
 const tier=params.tier==='Gold'?'Gold':'Pro';
 const [campResult,allPlans,goldOverview,auditResult]=await Promise.all([
  sb.rpc('aeromind_admin_campaigns'),
  sb.rpc('aeromind_admin_all_plans'),
  sb.rpc('aeromind_gold_admin_overview'),
  sb.from('aeromind_tier_campaign_audit').select('id,tier,created_at,reason').order('created_at',{ascending:false}).limit(20)
 ]);
 const allCampaigns=(Array.isArray(campResult.data)?campResult.data:[]) as Campaign[];
 const campaign=allCampaigns.find(x=>x.tier===tier);
 const plans=Array.isArray(allPlans.data)?allPlans.data as Plan[]:[];
 const overview=goldOverview.data as {global_enabled?:boolean;checkout_enabled?:boolean}|null;
 const blocked=!!campResult.error||!campaign;
 const goldPaused=!!goldOverview.error||overview?.global_enabled!==true||overview?.checkout_enabled!==true;
 const cta=tier==='Gold'?'/gold':'/pro';
 const announcement=campaign?[
  '✦ '+campaign.headline,
  campaign.description,
  ...campaign.features.map(f=>'✓ '+f),
  tier==='Gold'?'Gold em preparação; venda e recursos novos ainda indisponíveis.':
   'Consulte as ofertas publicadas; a liberação das novidades Aurora depende de atualização do aplicativo.',
  'Saiba mais: https://aeromind-site.vercel.app'+cta,
  '18+ · Sem garantia de ganhos.'
 ].join('\n'):'';
 return <CommercialAdminShell title="Divulgação Pro e Gold" active="/admin/divulgacao"
  description="Prepare campanhas, copie mensagens e acompanhe quais ofertas estão realmente disponíveis.">
  <div className="mc-page">
   <section className="admin-card mc-intro">
    <h2>Central comercial do AeroMind Aurora</h2>
    <p>Os textos abaixo podem ser publicados como material informativo, independentemente dos preços. <strong>Divulgação não libera licenças ou pagamentos.</strong> As funções novas do Aurora dependem de integração e testes na APK.</p>
    <div className="mc-links"><Link href="/planos">Vitrine de planos ↗</Link><Link href="/admin/planos">Editar preços Pro ↗</Link><Link href="/admin/gold">Gerenciar Gold ↗</Link></div>
   </section>
   <div className="mc-status-grid">
    <section className="admin-card"><span className="mc-eyebrow">PRO</span><h3>Ofertas existentes</h3>
     {allPlans.error?<p role="alert">Não foi possível consultar os preços do Pro.</p>:<PlanReadiness plans={plans}/>}
     <p>O botão de compra aparece somente quando o período está publicado e possui preço válido. Para configurar, use <Link href="/admin/planos">Planos e divulgação</Link>.</p>
    </section>
    <section className="admin-card"><span className="mc-eyebrow">GOLD</span><h3>Liberação comercial</h3>
     <p className={'mc-status-label '+(goldPaused?'mc-wait':'mc-ready')}>
      {goldPaused?'Lançamento em preparação — sem checkout':'Controles de Gold sinalizados como ativos'}
     </p>
     <p>A campanha Gold nunca cria pedidos nesta interface. A liberação depende do servidor e da integração da APK. <Link href="/admin/gold">Consultar autorizações e rollout ↗</Link></p>
    </section>
   </div>
   <div className="mc-tiers"><Link className={tier==='Pro'?'selected':''} href="/admin/divulgacao?tier=Pro">◈ Campanha Pro</Link>
    <Link className={tier==='Gold'?'selected':''} href="/admin/divulgacao?tier=Gold">✦ Campanha Gold</Link></div>
   {params.msg&&<p role="status" className={'admin-feedback '+(params.msg==='saved'?'good':'bad')}>{message[params.msg]||message.error}</p>}
   {blocked?<section className="admin-card"><p role="alert" className="admin-feedback bad">A configuração não pôde ser carregada. O editor foi bloqueado para evitar mudanças incorretas.</p></section>:
    <div className="mc-editor-grid">
     <section className="admin-card">
      <h2>Editar divulgação {tier}</h2>
      <p>Campos comerciais separados do catálogo de preços. Os textos publicados aparecem nas páginas de apresentação.</p>
      <form action={saveTierCampaign} className="mc-form">
       <input type="hidden" name="tier" value={tier}/>
       <label>Etiqueta superior<input name="eyebrow" defaultValue={campaign.eyebrow} required minLength={3} maxLength={65}/></label>
       <label>Título de divulgação<input name="headline" defaultValue={campaign.headline} required minLength={5} maxLength={110}/></label>
       <label>Descrição<textarea name="description" defaultValue={campaign.description} rows={4} required minLength={15} maxLength={400}/></label>
       <label>Selo do card<input name="badge" defaultValue={campaign.badge} required minLength={3} maxLength={65}/></label>
       <label>Texto do botão<input name="cta" defaultValue={campaign.cta_text} required minLength={3} maxLength={55}/></label>
       <label>Benefícios (2 a 6; um por linha)<textarea name="features" defaultValue={campaign.features.join('\n')} rows={7} required/></label>
       <label className="mc-checkbox"><input type="checkbox" name="visible" defaultChecked={campaign.visible}/><span>Mostrar esta campanha nas páginas públicas <small>Desmarcar pausa a campanha, mas não altera licenças ou planos.</small></span></label>
       <label>Motivo da alteração<input name="reason" required minLength={8} maxLength={350} placeholder="Ex.: Atualização da campanha Aurora"/></label>
       <button type="submit" className="mc-save">Salvar campanha {tier}</button>
      </form>
     </section>
     <section className="admin-card mc-preview">
      <span className="mc-eyebrow">PRÉVIA DO TEXTO ATUAL</span>
      <h2>{campaign.headline}</h2>
      <p className="mc-badge">{campaign.badge}</p>
      <p>{campaign.description}</p>
      <ul>{campaign.features.map((x,i)=><li key={i}>✓ {x}</li>)}</ul>
      <p className="mc-notice">{tier==='Gold'?'Gold em preparação. Não há compra ativa.':'Somente planos Pro publicados e com preço geram checkout. Novidades Aurora ainda dependem da APK.'}</p>
      <Link href={cta} className="mc-secondary">Abrir página pública ↗</Link>
      <details className="mc-share"><summary>Mensagem pronta para WhatsApp / grupo</summary><textarea readOnly value={announcement} rows={13} aria-label="Texto de divulgação pronto"/><CampaignCopyButton content={announcement}/></details>
     </section>
    </div>}
   <section className="admin-card">
    <h2>Histórico das campanhas</h2>
    {auditResult.error?<p role="alert">Não foi possível consultar o histórico.</p>:
    <div className="admin-table-scroll"><table><thead><tr><th>Quando</th><th>Plano</th><th>Justificativa</th></tr></thead><tbody>
     {(auditResult.data as Audit[]||[]).map(x=><tr key={x.id}><td>{fmt(x.created_at)}</td><td>{x.tier}</td><td>{x.reason}</td></tr>)}
     {!auditResult.data?.length&&<tr><td colSpan={3}>Nenhuma campanha editada até o momento.</td></tr>}
    </tbody></table></div>}
   </section>
  </div></CommercialAdminShell>;
}
