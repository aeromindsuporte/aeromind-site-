import Link from 'next/link';
import {getPublicCampaign} from '@/lib/campaigns';
import {getVisiblePlans,formattedPrice,effectivePriceCents,isFlashActive} from '@/lib/catalog';
import {durationLabelOf} from '@/lib/plan-display';
import '../gold/gold.css';
import './pro.css';

export const dynamic='force-dynamic';
export const metadata={title:'AeroMind Pro | Conheça os recursos',description:'AeroMind Pro: sinais de baixa, média e alta, histórico, ranking e até 5 sinais Radar Rosa por hora.'};
const periods=[{days:30,label:'Mensal'},{days:90,label:'Trimestral'},{days:180,label:'Semestral'},{days:365,label:'Anual'}];
const fallbacks=['Tudo do Básico','Radar Rosa: até 5 sinais de rosas por hora','Histórico das rodadas e ranking de casas','Alto Risco e agenda completa exclusivos Gold'];
export default async function ProInformation(){
 const [campaign,plans]=await Promise.all([getPublicCampaign('Pro'),getVisiblePlans()]);
 const offers=plans.filter(p=>p.tier==='Pro'&&p.slug.startsWith('pro-'));
 return <div className="ag-page pro-page">
  <header className="ag-header"><div className="ag-shell ag-nav">
   <Link href="/" className="ag-brand"><img src="/images/aeromind-mark.svg" alt="" width="43" height="43"/><strong>AeroMind</strong></Link>
   <nav aria-label="Navegação"><Link href="/">Início</Link><Link href="/planos">Planos</Link><Link href="/gold">Gold</Link></nav>
   <Link href="/planos" className="ag-pill-link">Ver planos ↗</Link>
  </div></header>
  <main>
   <section className="ag-hero ag-shell pro-hero">
    <div className="ag-hero-copy">
     <span className="ag-eyebrow">{campaign?.eyebrow||'AEROMIND PRO'}</span>
     <div className="ag-status"><span className="ag-status-dot"/> PRO · RECURSOS AMPLIADOS</div>
     <h1>AeroMind <em>Pro</em></h1>
     <p className="ag-lead">{campaign?.headline||'Uma experiência ampliada de monitoramento'}</p>
     <p>{campaign?.description||'Conheça as possibilidades do Pro. Os recursos novos do Aurora dependem da implementação no aplicativo.'}</p>
     <div className="ag-actions">
      <a href="#periodos" className="ag-cta">{campaign?.cta_text||'Conhecer o Pro'} ↓</a>
      <Link className="ag-secondary" href="/gold">Comparar com Gold ↗</Link>
     </div>
     <small>18+ · Ferramentas de observação e análise. Resultados passados não asseguram resultados futuros.</small>
    </div>
    <div className="ag-preview pro-preview" role="img" aria-label="Comparativo informativo dos níveis do Radar Rosa V4 planejados para AeroMind Aurora">
     <div className="ag-preview-top"><span>AEROMIND PRO · AURORA</span><span>◈</span></div>
     <div className="ag-preview-label">RADAR ROSA · NÍVEIS DE ACESSO</div>
     <div className="pro-comparison"><div><small>BÁSICO</small><strong>CORE 3</strong><span>Ranks 1 a 3</span></div><div className="highlight"><small>PRO</small><strong>AMPLIADO 5</strong><span>Ranks 1 a 5</span></div><div><small>GOLD</small><strong>EXPANDIDO 7</strong><span>Ranks 1 a 7</span></div></div>
     <div className="ag-preview-footer">DEMONSTRAÇÃO COMPARATIVA · SEM SINAIS AO VIVO</div>
    </div>
   </section>
   <section className="ag-section ag-shell">
    <div className="ag-section-title"><span>O QUE VOCÊ ENCONTRA</span><h2>Recursos Pro</h2>
     <p>Os benefícios dependem da licença e da versão instalada. Os sinais são informativos e não garantem acertos.</p></div>
    <div className="pro-feature-grid">{(campaign?.features||fallbacks).map((feature,i)=><article key={i}><span aria-hidden="true">✓</span>{feature}</article>)}</div>
   </section>
   <section className="ag-section ag-shell" id="periodos">
    <div className="ag-section-title"><span>OFERTAS DO CATÁLOGO</span><h2>Períodos disponíveis</h2>
     <p>Somente períodos publicados no catálogo administrativo, com preço confirmado, podem ser contratados.</p></div>
    <div className="pro-offer-grid">
     {periods.map(({days,label})=>{
      const plan=offers.find(x=>x.duration_days===days);
      return <article key={days} className={'pro-offer '+(!plan?'unavailable':'')}>
       <small>{label}</small><strong>{plan?formattedPrice(effectivePriceCents(plan)):'Em configuração'}</strong>
       <p>{plan?durationLabelOf(plan):'Preço ainda não publicado'}</p>
       {plan?<Link href={'/checkout?plano='+encodeURIComponent(plan.slug)}>Escolher Pro →</Link>:
        <span>Venda indisponível</span>}
      </article>;
     })}
    </div>
   </section>
   <section className="ag-bottom ag-shell"><h2>Quer conhecer o Gold?</h2>
    <p>Conheça o acesso Gold: até 7 sinais Rosa por hora, Alto Risco, agenda completa, sinais Premium e suporte prioritário. Comunidade VIP e lives em implantação.</p>
    <Link href="/gold" className="ag-cta">Conhecer Gold →</Link></section>
  </main>
  <footer className="ag-footer"><div className="ag-shell">© 2026 AeroMind · 18+ · <Link href="/termos">Termos</Link> · <Link href="/privacidade">Privacidade</Link></div></footer>
 </div>;
}
