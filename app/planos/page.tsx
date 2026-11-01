import Link from 'next/link';
import {getPublicCampaigns} from '@/lib/campaigns';
import {getVisiblePlans,formattedPrice,effectivePriceCents,isFlashActive} from '@/lib/catalog';
import {benefitsOf,descriptionOf,durationLabelOf} from '@/lib/plan-display';
import {FlashCountdown} from '@/components/plan/FlashCountdown';

export const dynamic='force-dynamic';
export const metadata={title:'Planos e preços | AeroMind',description:'Compare AeroMind Básico, Pro e Gold: Radar Rosa com até 3, 5 ou 7 sinais por hora, benefícios de cada nível e preços por período.'};

const cards=[
 {tier:'Básico' as const, css:'am-plan-blue',icon:'◉',desc:'Acompanhe os sinais essenciais',features:['Sinais de baixa, média e alta','Radar Rosa: até 3 sinais por hora','Histórico de rodadas','Ranking de casas']},
 {tier:'Pro' as const, css:'am-plan-purple',icon:'◈',desc:'Mais Radar Rosa para acompanhar',features:['Tudo do Básico','Radar Rosa: até 5 sinais por hora','Histórico e ranking de casas','Alto Risco exclusivo Gold']},
 {tier:'Ultra' as const, css:'am-plan-gold',icon:'✦',desc:'A experiência mais completa do AeroMind',features:['Tudo do Pro','Radar Rosa: até 7 sinais por hora','Alto Risco e agenda do dia','Sinais Premium do administrador','Suporte prioritário e Comunidade Gold']}
];

type PlanTier = 'Básico' | 'Pro' | 'Ultra';
type BenefitState = 'included' | 'locked' | 'planned';
type BenefitItem = {label:string;state:BenefitState};

const goldOnlyBenefit=/alto risco|agenda completa|sinais? premium|notificaç(?:ão|ões).*premium|suporte prioritário|comunidade gold|lives? exclusiv|50x/i;
const futureBenefit=/em implantação|em desenvolvimento|planejad|quando dispon[ií]ve(?:l|is)|quando programad/i;
const goldOnlyExtras=[
 'Sinais Premium do administrador',
 'Suporte prioritário',
 'Comunidade Gold VIP e lives',
 'Estudos especiais com alvo de até 50x'
];

/** Os textos permanecem editáveis no painel; a permissão não é inferida de um ✓ visual. */
function formatBenefits(tier:PlanTier,features:string[]):BenefitItem[]{
 const list=features.flatMap((feature):string[]=>{
  if(tier!=='Ultra'&&/alto risco e agenda completa/i.test(feature)){
   return ['Sinais de Alto Risco','Agenda completa dos sinais do dia'];
  }
  return [feature];
 });
 if(tier!=='Ultra'){
  for(const extra of ['Sinais de Alto Risco','Agenda completa dos sinais do dia',...goldOnlyExtras]){
   const existing=extra.startsWith('Sinais de Alto Risco')?/alto risco/i:
    extra.startsWith('Agenda completa')?/agenda completa/i:
    extra.startsWith('Sinais Premium')?/sinais? premium/i:
    extra.startsWith('Suporte prioritário')?/suporte prioritário/i:
    extra.startsWith('Comunidade Gold')?/comunidade gold/i:/50x/i;
   if(!list.some(feature=>existing.test(feature)))list.push(extra);
  }
 }
 return list.map(feature=>{
  const state:BenefitState=tier!=='Ultra'&&goldOnlyBenefit.test(feature)?'locked':
   futureBenefit.test(feature)?'planned':'included';
  const label=feature
   .replace(/\s*\(em implantação\)/ig,'')
   .replace(/,?\s*quando dispon[ií]veis/ig,'')
   .replace(/,?\s*quando programad[oa]s/ig,'')
   .replace(/\s*[—-]?\s*são exclusivos Gold/ig,'')
   .trim();
  return {label,state};
 }).sort((a,b)=>({included:0,planned:1,locked:2}[a.state]-{included:0,planned:1,locked:2}[b.state]));
}

function BenefitList({tier,features}:{tier:PlanTier;features:string[]}){
 const items=formatBenefits(tier,features);
 return <ul className="am-plan-feature-list">{items.map((item,i)=><li key={i} className={'am-feature-'+item.state}>
  <span className="am-feature-state" aria-hidden="true">{item.state==='included'?'✓':item.state==='locked'?'✕':'◷'}</span>
  <span className="am-feature-text">{item.label}</span>
  {item.state!=='included'&&<span className="am-feature-status">{item.state==='locked'?'Só no Gold':'Em implantação'}</span>}
 </li>)}</ul>;
}

export default async function Plans({searchParams}:{searchParams:Promise<{periodo?:string}>}) {
 const params=await searchParams;
 const choices=[{slug:'mensal',days:30,label:'Mensal'},{slug:'trimestral',days:90,label:'Trimestral'},{slug:'semestral',days:180,label:'Semestral'},{slug:'anual',days:365,label:'Anual'}];
 const selected=choices.find(x=>x.slug===params.periodo)?.slug||'mensal';
 const periodKey=selected;
 const [planData,campaigns]=await Promise.all([getVisiblePlans(),getPublicCampaigns()]);
 const proCampaign=campaigns.find(x=>x.tier==='Pro');
 const trials=planData.filter(p=>p.slug==='teste-horas'||p.slug==='teste-dias');
 return <>
 <link rel="stylesheet" href="/design-v2.css"/>
 <div className="am-site">
  <header className="am-header"><div className="am-shell am-nav">
   <Link href="/" className="am-logo"><img src="/images/aeromind-mark.svg" width="43" height="43" alt="Símbolo AeroMind"/><strong>AeroMind</strong></Link>
   <nav className="am-desktop-nav" aria-label="Navegação"><Link href="/">Início</Link><Link href="/funcionalidades">Funcionalidades</Link><Link className="am-current" href="/planos">Planos</Link><Link href="/contato">Contato</Link></nav>
   <div className="am-header-actions"><Link href="/entrar" className="am-btn am-outline am-compact">Entrar</Link><Link href="/cadastro" className="am-btn am-fill am-compact">Criar conta →</Link></div>
  </div></header>
  <main className="am-shell" style={{paddingTop:55,paddingBottom:100}}>
   <Link href="/#planos" className="am-btn am-outline am-compact" style={{marginBottom:26}}>← Voltar ao início</Link>
   <section className="am-plans" style={{paddingTop:20}}>
    <div className="am-plans-intro"><span className="am-eyebrow">✦ SUA EXPERIÊNCIA AEROMIND, DO SEU JEITO</span><h1 style={{fontSize:'clamp(34px,4vw,56px)',margin:'4px 0 18px'}}>Mais clareza. Mais recursos. <span style={{color:'#ffd68b'}}>Mais AeroMind.</span></h1><p>Escolha quanto deseja acompanhar: <strong>Básico com até 3</strong>, <strong>Pro com até 5</strong> ou <strong>Gold com até 7 sinais do Radar Rosa por hora</strong>. Veja o que cada licença inclui e escolha seu período de acesso.</p>
    <div className="am-benefit-legend" aria-label="Legenda dos benefícios"><span><b className="am-legend-included">✓</b> Incluído</span><span><b className="am-legend-locked">✕</b> Só no Gold</span><span><b className="am-legend-planned">◷</b> Em implantação</span></div>
    <div className="am-plan-toggle" aria-label="Selecionar duração">
      {choices.map(c=><Link key={c.slug} className={selected===c.slug?'am-active-period':''} href={'/planos?periodo='+c.slug} aria-current={selected===c.slug?'page':undefined}>{c.label}</Link>)}
    </div></div>
    <p className="am-swipe-plans">Deslize para o lado e compare os três planos <span aria-hidden="true">→</span></p>
    <div className="am-plans-cards">
      {cards.map(card=>{
        // Gold é o novo nome comercial do card Ultra; o tier interno é preservado
        // para que licenças e cadastros antigos não sejam migrados ou revogados.
        const plan=planData.find(p=>p.tier===card.tier && p.slug.endsWith('-'+periodKey));
        if(card.tier==='Pro'&&!plan)return proCampaign?<Link key={card.tier} href="/pro"
         className={'am-plan '+card.css+' am-pro-preview'}
         aria-label="Conhecer AeroMind Pro — sem preço publicado neste período">
         <span className="am-top-label">{proCampaign.badge}</span>
         <span className="am-plan-icon" aria-hidden="true">{card.icon}</span>
         <h3>Pro</h3><strong>Em configuração</strong>
         <small>Preço e venda ainda não publicados</small>
         <p>{proCampaign.description}</p>
         <BenefitList tier="Pro" features={proCampaign.features.slice(0,5)}/>
         <span className="am-btn am-outline">{proCampaign.cta_text} →</span>
        </Link>:null;
        return <article className={'am-plan '+card.css} key={card.tier}>
        {(plan?.marketing_badge||plan?.marketing_highlight)&&<span className="am-top-label">{plan?.marketing_badge||'EM DESTAQUE'}</span>}
        <span className="am-plan-icon">{card.icon}</span><h3>{plan?.marketing_title||(card.tier==='Ultra'?'Gold':card.tier)}</h3>
        <strong>{plan?formattedPrice(effectivePriceCents(plan)):'Em definição'}</strong>
        <small>{plan?durationLabelOf(plan):'Preço não publicado'}</small>
        {plan&&isFlashActive(plan)&&<><FlashCountdown endsAt={plan.flash_ends_at!} label={plan.flash_label||'Oferta relâmpago'}/><small>Preço regular após o prazo: {formattedPrice(plan.price_cents)}</small></>}
        <p>{plan?descriptionOf(plan):card.desc}</p>
        <BenefitList tier={card.tier} features={plan?benefitsOf(plan):card.features}/>
        {plan?<Link href={'/checkout?plano='+encodeURIComponent(plan.slug)} className={'am-btn '+(plan.marketing_highlight?'am-fill':'am-outline')}>{plan.marketing_cta||'Garantir meu acesso'} →</Link>:<span className="am-btn am-outline" aria-disabled="true">Indisponível</span>}
        </article>
      })}
    </div>
   </section>
   {trials.length>0&&<section className="am-plans" id="testes" style={{paddingTop:32}}>
    <div className="am-plans-intro"><span className="am-eyebrow">✦ TESTE AEROMIND</span><h2>Experimente por horas ou dias</h2><p>Planos com validade personalizada. O acesso começa após a confirmação do pagamento.</p></div>
    <div className="am-plans-cards">{trials.map(p=><article key={p.slug} className="am-plan am-plan-blue">
     {(p.marketing_badge||p.marketing_highlight)&&<span className="am-top-label">{p.marketing_badge||'EXPERIMENTE'}</span>}
     <span className="am-plan-icon">◷</span><h3>{p.marketing_title||(p.slug==='teste-horas'?'Teste por horas':'Teste por dias')}</h3>
     <strong>{formattedPrice(effectivePriceCents(p))}</strong><small>{durationLabelOf(p)}</small>
     <p>{descriptionOf(p)}</p>
     <BenefitList tier={p.tier} features={benefitsOf(p)}/>
     <Link className={'am-btn '+(p.marketing_highlight?'am-fill':'am-outline')} href={(p.price_cents===0?'/teste-gratis?plano=':'/checkout?plano=')+encodeURIComponent(p.slug)}>{p.marketing_cta||'Experimentar'} →</Link>
    </article>)}</div>
   </section>}
   <section className="am-plans-intro" style={{padding:'30px 0 12px'}}><span className="am-eyebrow">COMPARE OS BENEFÍCIOS</span><h2>Qual plano combina com você?</h2><p><strong>Básico:</strong> sinais de baixa, média e alta, histórico e ranking, com até 3 rosas/h. <strong>Pro:</strong> todos os recursos anteriores e até 5 rosas/h. <strong>Gold:</strong> até 7 rosas/h, Alto Risco, agenda do dia, sinais Premium e suporte prioritário. Comunidade Gold, lives e estudos com alvos de até 50x: benefícios programados, sujeitos à disponibilização.</p><p>O Alto Risco, a agenda completa e os sinais Premium não fazem parte dos planos Básico e Pro. Nenhum sinal ou alvo representa garantia de resultado.</p><Link className="am-btn am-outline" href="/gold">Conhecer todos os benefícios Gold →</Link></section>
   <p className="am-price-notice">ℹ Criar uma conta não libera o monitor. É necessária uma licença ativa. Nenhum resultado histórico garante ganhos.</p>
   <p className="am-price-note" style={{marginTop:20}}>Os preços e recursos são configurados pelo administrador. Pagamentos são processados por Pix e a licença só é liberada após confirmação pelo servidor.</p>
  </main>
  <footer className="am-footer"><div className="am-shell am-footer-note">© 2026 AeroMind · Uso responsável · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos de uso</Link></div></footer>
 </div></>;
}
