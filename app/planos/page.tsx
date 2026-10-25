import Link from 'next/link';
import {getPublicCampaigns} from '@/lib/campaigns';
import {getVisiblePlans,formattedPrice,formattedDuration} from '@/lib/catalog';
import {benefitsOf,descriptionOf,durationLabelOf} from '@/lib/plan-display';

export const dynamic='force-dynamic';
export const metadata={title:'Planos | AeroMind',	description:'Conheça Básico, Pro e Gold. Somente planos com preço publicado podem ser contratados; Gold está em preparação.'};

const cards=[
 {tier:'Básico' as const, css:'am-plan-blue',icon:'♙',desc:'Monitoramento essencial',features:['Interface e monitor B4','Histórico do aplicativo','Alertas básicos']},
 {tier:'Pro' as const, css:'am-plan-purple',icon:'◈',desc:'Experiência ampliada',features:['Módulos adicionais','Histórico completo','Previsão Rosa V4','Alertas do monitor']},
 {tier:'Ultra' as const, css:'am-plan-gold',icon:'✦',desc:'Ferramentas avançadas em desenvolvimento',features:['Indicadores personalizáveis','Comparador Clássico, Refinado e Gold','Simulador virtual e relatórios']}
];

export default async function Plans({searchParams}:{searchParams:Promise<{periodo?:string}>}) {
 const params=await searchParams;
 const choices=[{slug:'mensal',days:30,label:'Mensal'},{slug:'trimestral',days:90,label:'Trimestral'},{slug:'semestral',days:180,label:'Semestral'},{slug:'anual',days:365,label:'Anual'}];
 const selected=choices.find(x=>x.slug===params.periodo)?.slug||'mensal';
 const days=choices.find(x=>x.slug===selected)?.days||30;
 const [planData,campaigns]=await Promise.all([getVisiblePlans(),getPublicCampaigns()]);
 const goldCampaign=campaigns.find(x=>x.tier==='Gold');
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
    <div className="am-plans-intro"><span className="am-eyebrow">✦ PLANOS AEROMIND</span><h1 style={{fontSize:'clamp(34px,4vw,56px)',margin:'4px 0 18px'}}>Escolha o plano ideal</h1><p>Compare Básico, Pro e Gold. Preços são exibidos apenas quando publicados no catálogo. O Gold está em preparação.</p>
    <div className="am-plan-toggle" aria-label="Selecionar duração">
      {choices.map(c=><Link key={c.slug} className={selected===c.slug?'am-active-period':''} href={'/planos?periodo='+c.slug} aria-current={selected===c.slug?'page':undefined}>{c.label}</Link>)}
    </div></div>
    <div className="am-plans-cards">
      {cards.map(card=>{
        // Gold é o novo nome comercial do card Ultra; o tier interno é preservado
        // para que licenças e cadastros antigos não sejam migrados ou revogados.
        if(card.tier==='Ultra')return goldCampaign?<Link key={card.tier} href="/gold"
         className={'am-plan '+card.css+' am-gold-preview'}
         aria-label="Conhecer o AeroMind Gold — em preparação, sem venda ativa">
         <span className="am-top-label">{goldCampaign.badge}</span>
         <span className="am-plan-icon" aria-hidden="true">{card.icon}</span>
         <h3>Gold</h3>
         <strong>Em preparação</strong>
         <small>Venda ainda não disponível</small>
         <p>{goldCampaign.description}</p>
         <ul>{goldCampaign.features.slice(0,5).map((feature,i)=><li key={i}>✓ {feature}</li>)}</ul>
         <span className="am-btn am-outline">{goldCampaign.cta_text} →</span>
        </Link>:null;
        const plan=planData.find(p=>p.tier===card.tier && p.duration_days===days);
        if(card.tier==='Pro'&&!plan)return proCampaign?<Link key={card.tier} href="/pro"
         className={'am-plan '+card.css+' am-pro-preview'}
         aria-label="Conhecer AeroMind Pro — sem preço publicado neste período">
         <span className="am-top-label">{proCampaign.badge}</span>
         <span className="am-plan-icon" aria-hidden="true">{card.icon}</span>
         <h3>Pro</h3><strong>Em configuração</strong>
         <small>Preço e venda ainda não publicados</small>
         <p>{proCampaign.description}</p>
         <ul>{proCampaign.features.slice(0,5).map((feature,i)=><li key={i}>✓ {feature}</li>)}</ul>
         <span className="am-btn am-outline">{proCampaign.cta_text} →</span>
        </Link>:null;
        return <article className={'am-plan '+card.css} key={card.tier}>
        {(plan?.marketing_badge||plan?.marketing_highlight)&&<span className="am-top-label">{plan?.marketing_badge||'EM DESTAQUE'}</span>}
        <span className="am-plan-icon">{card.icon}</span><h3>{plan?.marketing_title||card.tier}</h3>
        <strong>{plan?formattedPrice(plan.price_cents):'Em definição'}</strong>
        <small>{plan?durationLabelOf(plan):'Preço não publicado'}</small>
        <p>{plan?descriptionOf(plan):card.desc}</p><ul>{(plan?benefitsOf(plan):card.features).map((feature,i)=><li key={i}>✓ {feature}</li>)}</ul>
        {plan?<Link href={'/checkout?plano='+encodeURIComponent(plan.slug)} className={'am-btn '+(plan.marketing_highlight?'am-fill':'am-outline')}>{plan.marketing_cta||'Escolher plano'} →</Link>:<span className="am-btn am-outline" aria-disabled="true">Indisponível</span>}
        </article>
      })}
    </div>
   </section>
   {trials.length>0&&<section className="am-plans" id="testes" style={{paddingTop:32}}>
    <div className="am-plans-intro"><span className="am-eyebrow">✦ TESTE AEROMIND</span><h2>Experimente por horas ou dias</h2><p>Planos com validade personalizada. O acesso começa após a confirmação do pagamento.</p></div>
    <div className="am-plans-cards">{trials.map(p=><article key={p.slug} className="am-plan am-plan-blue">
     {(p.marketing_badge||p.marketing_highlight)&&<span className="am-top-label">{p.marketing_badge||'EXPERIMENTE'}</span>}
     <span className="am-plan-icon">◷</span><h3>{p.marketing_title||(p.slug==='teste-horas'?'Teste por horas':'Teste por dias')}</h3>
     <strong>{formattedPrice(p.price_cents)}</strong><small>{durationLabelOf(p)}</small>
     <p>{descriptionOf(p)}</p>
     <ul>{benefitsOf(p).map((feature,i)=><li key={i}>✓ {feature}</li>)}</ul>
     <Link className={'am-btn '+(p.marketing_highlight?'am-fill':'am-outline')} href={(p.price_cents===0?'/teste-gratis?plano=':'/checkout?plano=')+encodeURIComponent(p.slug)}>{p.marketing_cta||'Experimentar'} →</Link>
    </article>)}</div>
   </section>}
   <p className="am-price-note" style={{marginTop:22}}>◈ <Link href="/pro" style={{color:"#ccaaff",textDecoration:"underline",textUnderlineOffset:3}}>Conheça o AeroMind Pro</Link> — veja recursos e ofertas disponíveis. <br/>✦ <Link href="/gold" style={{color:'#f2d18f',textDecoration:'underline',textUnderlineOffset:3}}>Conheça o AeroMind Gold (em preparação)</Link> — uma apresentação informativa, sem compra ativa. Os planos atuais permanecem independentes.</p>
   <p className="am-price-notice">ℹ Criar uma conta não libera o monitor. É necessária uma licença ativa. Nenhum resultado histórico garante ganhos.</p>
   <p className="am-price-note" style={{marginTop:20}}>Os preços e recursos são configurados pelo administrador. Pagamentos são processados por Pix e a licença só é liberada após confirmação pelo servidor.</p>
  </main>
  <footer className="am-footer"><div className="am-shell am-footer-note">© 2026 AeroMind · Uso responsável · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos de uso</Link></div></footer>
 </div></>;
}
