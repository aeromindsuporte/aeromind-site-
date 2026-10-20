import Link from 'next/link';
import {getVisiblePlans,formattedPrice} from '@/lib/catalog';

export const dynamic='force-dynamic';
export const metadata={title:'Planos | AeroMind',description:'Veja preços atuais dos planos AeroMind e contrate por Pix com liberação após confirmação.'};

const cards=[
 {tier:'Básico' as const, css:'am-plan-blue',icon:'♙',desc:'Monitoramento essencial',features:['Interface e monitor B4','Histórico do aplicativo','Alertas básicos']},
 {tier:'Pro' as const, css:'am-plan-purple',icon:'◈',desc:'Experiência ampliada',features:['Módulos adicionais','Histórico completo','Previsão Rosa V4','Alertas do monitor']},
 {tier:'Ultra' as const, css:'am-plan-gold',icon:'♜',desc:'Recursos avançados',features:['Funcionalidades a definir','Ranking e estatísticas','Suporte planejado']}
];

export default async function Plans({searchParams}:{searchParams:Promise<{periodo?:string}>}) {
 const params=await searchParams;
 const choices=[{slug:'mensal',days:30,label:'Mensal'},{slug:'trimestral',days:90,label:'Trimestral'},{slug:'semestral',days:180,label:'Semestral'},{slug:'anual',days:365,label:'Anual'}];
 const selected=choices.find(x=>x.slug===params.periodo)?.slug||'mensal';
 const days=choices.find(x=>x.slug===selected)?.days||30;
 const planData=await getVisiblePlans();
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
    <div className="am-plans-intro"><span className="am-eyebrow">✦ PLANOS AEROMIND</span><h1 style={{fontSize:'clamp(34px,4vw,56px)',margin:'4px 0 18px'}}>Escolha o plano ideal</h1><p>Consulte os preços e recursos dos planos. O acesso depende da licença válida no servidor.</p>
    <div className="am-plan-toggle" aria-label="Selecionar duração">
      {choices.map(c=><Link key={c.slug} className={selected===c.slug?'am-active-period':''} href={'/planos?periodo='+c.slug} aria-current={selected===c.slug?'page':undefined}>{c.label}</Link>)}
    </div></div>
    <div className="am-plans-cards">
      {cards.map(card=>{
        const plan=planData.find(p=>p.tier===card.tier && p.duration_days===days);
        return <article className={'am-plan '+card.css} key={card.tier}>
        {(plan?.marketing_badge||plan?.marketing_highlight)&&<span className="am-top-label">{plan?.marketing_badge||'EM DESTAQUE'}</span>}
        <span className="am-plan-icon">{card.icon}</span><h3>{plan?.marketing_title||card.tier}</h3>
        <strong>{plan?formattedPrice(plan.price_cents):'Em definição'}</strong>
        <small>{plan?'Valor por '+days+' dias':'Preço não publicado'}</small>
        <p>{plan?.marketing_description||card.desc}</p><ul>{(plan?.marketing_features?.length?plan.marketing_features:card.features).map((feature,i)=><li key={i}>✓ {feature}</li>)}</ul>
        {plan?<Link href={'/checkout?plano='+encodeURIComponent(plan.slug)} className={'am-btn '+(plan.marketing_highlight?'am-fill':'am-outline')}>{plan.marketing_cta||'Escolher plano'} →</Link>:<span className="am-btn am-outline" aria-disabled="true">Indisponível</span>}
        </article>
      })}
    </div>
   </section>
   <p className="am-price-notice">ℹ Criar uma conta não libera o monitor. É necessária uma licença ativa. Nenhum resultado histórico garante ganhos.</p>
   <p className="am-price-note" style={{marginTop:20}}>Os preços e recursos são configurados pelo administrador. Pagamentos são processados por Pix e a licença só é liberada após confirmação pelo servidor.</p>
  </main>
  <footer className="am-footer"><div className="am-shell am-footer-note">© 2026 AeroMind · Uso responsável · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos de uso</Link></div></footer>
 </div></>;
}
