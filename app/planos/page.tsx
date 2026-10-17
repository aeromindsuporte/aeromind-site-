import Link from 'next/link';
import {getVisiblePlans,formattedPrice} from '@/lib/catalog';

export const dynamic='force-dynamic';
export const metadata={title:'Planos | AeroMind',description:'Consulte os planos AeroMind. Contratação e licenças ainda indisponíveis.'};

const cards=[
 {tier:'Básico' as const, css:'am-plan-blue',icon:'♙',desc:'Monitoramento essencial',features:['Interface e monitor B4','Histórico do aplicativo','Alertas básicos']},
 {tier:'Pro' as const, css:'am-plan-purple',icon:'◈',desc:'Experiência ampliada',features:['Módulos adicionais','Histórico completo','Previsão Rosa V4','Alertas do monitor']},
 {tier:'Ultra' as const, css:'am-plan-gold',icon:'♜',desc:'Recursos avançados',features:['Funcionalidades a definir','Ranking e estatísticas','Suporte planejado']}
];

export default async function Plans({searchParams}:{searchParams:Promise<{periodo?:string}>}) {
 const params=await searchParams;
 const selected=params.periodo==='anual'?'anual':'mensal';
 const days=selected==='anual'?365:30;
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
    <div className="am-plans-intro"><span className="am-eyebrow">✦ PLANOS AEROMIND</span><h1 style={{fontSize:'clamp(34px,4vw,56px)',margin:'4px 0 18px'}}>Escolha o plano ideal</h1><p>Consulte os preços habilitados no painel administrativo. Os valores exibidos não representam uma compra disponível.</p>
    <div className="am-plan-toggle" aria-label="Selecionar duração">
      <Link className={selected==='mensal'?'am-active-period':''} href="/planos?periodo=mensal" aria-current={selected==='mensal'?'page':undefined}>Mensal</Link>
      <Link className={selected==='anual'?'am-active-period':''} href="/planos?periodo=anual" aria-current={selected==='anual'?'page':undefined}>Anual</Link>
    </div></div>
    <div className="am-plans-cards">
      {cards.map(card=>{
        const plan=planData.find(p=>p.tier===card.tier && p.duration_days===days);
        return <article className={'am-plan '+card.css} key={card.tier}>
        {card.tier==='Pro'&&<span className="am-top-label">EM DESTAQUE</span>}
        <span className="am-plan-icon">{card.icon}</span><h3>{card.tier}</h3>
        <strong>{plan?formattedPrice(plan.price_cents):'Em definição'}</strong>
        <small>{plan?(selected==='mensal'?'Valor por 30 dias':'Valor por 365 dias'):'Preço não publicado'}</small>
        <p>{card.desc}</p><ul>{card.features.map(f=><li key={f}>✓ {f}</li>)}</ul>
        <Link href="/cadastro" className={'am-btn '+(card.tier==='Pro'?'am-fill':'am-outline')}>Criar conta gratuita →</Link>
        </article>
      })}
    </div>
   </section>
   <p className="am-price-notice">⚠ A criação da conta é gratuita e não concede licença. Contratação, pagamento e download ainda estão indisponíveis. Nenhum resultado do monitor é garantido.</p>
   <p className="am-price-note" style={{marginTop:20}}>Outras durações poderão ser apresentadas após aprovação comercial.</p>
  </main>
  <footer className="am-footer"><div className="am-shell am-footer-note">© 2026 AeroMind · Uso responsável · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos de uso</Link></div></footer>
 </div></>;
}
