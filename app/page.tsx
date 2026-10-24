import Link from 'next/link';
import type {Metadata} from 'next';
import './landing-neon.css';

export const metadata:Metadata={
 title:'AeroMind | Mais clareza para suas decisões no Aviator',
 description:'Conheça o AeroMind Monitor: indicadores de Crash, minutos de rosa e resultados históricos em uma interface organizada. Veja os planos disponíveis.',
 robots:{index:true,follow:true}
};

const sample=[
 {key:'low',icon:'⬟',label:'BAIXA',value:'1.58x'},
 {key:'medium',icon:'◎',label:'MEDIANA',value:'2.16x'},
 {key:'high',icon:'↗',label:'ALTA',value:'3.03x'},
 {key:'risk',icon:'✦',label:'ALTO RISCO',value:'20.59x'}
] as const;

function AeroMark({small=false}:{small?:boolean}){
 return <span className={'nl-mark'+(small?' nl-mark-small':'')} aria-hidden="true">
  <svg viewBox="0 0 58 53" width="56" height="51" fill="none">
   <path d="M13.5 38.5C5 39.2 3.4 29.2 8.5 24c2.4-2.5 5.1-2.4 8.1-2.3C15.6 13.3 22.9 7 31.8 9.5c4.6 1.2 7.3 4.4 8.5 8.4 5.7-.4 10.6 4.1 10.6 9.8 0 6.2-4.7 10.8-11 10.6" stroke="#00C7FF" strokeWidth="3.5" strokeLinecap="round"/>
   <path d="M19.8 35.4c.2-7.1 6.4-7.8 9.3-3.4 2.6-4.6 9.5-4.4 11.7.6M29 26.5c-2.1-6.5-9.1-5.8-11.4-1.5m10.7 12.6c.9 7.2-1.3 10.8-8.4 12.9m11.7-10.4c3.7 2.4 6.8 1.6 9.1-2.1" stroke="#00C7FF" strokeWidth="2.5" strokeLinecap="round"/>
   <path d="M24 19.5c2.7-1.2 5.6-.7 6.8 1.8" stroke="#AA39FA" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
 </span>;
}

function CurveChart(){
 return <svg viewBox="0 0 520 245" preserveAspectRatio="none" className="nl-curve" aria-hidden="true">
  <defs>
   <linearGradient id="nl-red-curve" x1="0" y1="1" x2="1" y2="0">
    <stop stopColor="#DA003D" stopOpacity=".15"/>
    <stop offset=".65" stopColor="#F00662" stopOpacity=".67"/>
    <stop offset="1" stopColor="#FF0069" stopOpacity=".95"/>
   </linearGradient>
   <linearGradient id="nl-curve-bg" x1="0" y1="0" x2="1" y2="1">
    <stop stopColor="#171124"/><stop offset="1" stopColor="#0C0C1C"/>
   </linearGradient>
   <filter id="nl-glow"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <rect width="520" height="245" fill="url(#nl-curve-bg)"/>
  {Array.from({length:13},(_,i)=><path key={i} d={`M0 245 L${70+i*42} 0`} stroke="#6B5376" strokeOpacity=".065" strokeWidth="20"/>)}
  <path d="M0 236 C100 233 168 216 229 189 C306 155 366 103 520 8 L520 245 L0 245 Z" fill="url(#nl-red-curve)"/>
  <path d="M0 236 C100 233 168 216 229 189 C306 155 366 103 520 8" stroke="#FF006F" strokeWidth="5" filter="url(#nl-glow)" fill="none"/>
  <path d="M0 236 C100 233 168 216 229 189 C306 155 366 103 520 8" stroke="#FF3D9A" strokeWidth="2" fill="none"/>
  <g transform="translate(434 36) rotate(-23)" stroke="#FF0C75" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round">
   <path d="M-30 8 29 -9 38 -4 11 7-15 13-30 8ZM-4 4 2-23 13-27 16 2M-14 10-19 22-7 22 4 8"/>
  </g>
 </svg>;
}
function Multipliers({compact=false}:{compact?:boolean}){
 return <div className={'nl-multipliers'+(compact?' nl-multipliers-compact':'')}>
  {sample.map(item=><div key={item.key} className={'nl-multi nl-'+item.key}>
   <span className="nl-multi-icon" aria-hidden="true">{item.icon}</span>
   <span className="nl-multi-name">{item.label}</span>
   <strong>{item.value}</strong>
  </div>)}
 </div>;
}
function DeviceMockup(){
 return <div className="nl-stage" aria-label="Prévia demonstrativa dos indicadores e da interface do AeroMind">
  <div className="nl-stage-halo" aria-hidden="true"/>
  <div className="nl-stage-bars" aria-hidden="true"><span/><span/><span/><span/><span/></div>
  <svg className="nl-plane-decoration" width="240" height="150" viewBox="0 0 240 150" aria-hidden="true" fill="none">
   <path d="M6 128c54-27 85-47 123-86m-27 33 39-41 84-28-9 16-57 30-28 49-13-3 13-43-35 12-24 26-9-4 14-33-25 7-9-11 44-15Z" stroke="#FB156F" strokeWidth="3.4" strokeLinejoin="round"/>
  </svg>
  <div className="nl-phone-shadow" aria-hidden="true"/>
  <div className="nl-phone">
   <div className="nl-phone-bezel">
    <div className="nl-speaker"/>
    <div className="nl-phone-inner">
     <div className="nl-phone-status"><strong>19:55</strong><span>▰ ▴ ◧</span></div>
     <div className="nl-phone-top"><span className="nl-phone-brand">AEROMIND</span><span className="nl-phone-controls"><b>⛶</b><b>?</b><b>☰</b></span></div>
     <small className="nl-phone-caption">Monitor v0.27.2 — comercial ativo</small>
     <Multipliers/>
     <div className="nl-radar-label">RADAR AEROMIND <span>•</span> ROXO EM EVOLUÇÃO</div>
     <div className="nl-phone-clock"><strong>19:55:41</strong><span>Última rosa 19:49:26 • 556.26x<br/>Intervalo #1</span><b>EQUILÍBRIO</b></div>
     <div className="nl-chart"><CurveChart/><strong>150.38x</strong></div>
     <div className="nl-phone-footer">HISTÓRICO EXATO <span>▤</span> RESULTADOS</div>
    </div>
   </div>
  </div>
 </div>;
}
function Flower({size=30}:{size?:number}){
 return <span aria-hidden="true" style={{fontSize:size,lineHeight:1}}>🌸</span>;
}
function MiniCrash(){
 return <div className="nl-mini-crash" aria-label="Prévia dos quatro indicadores de Crash">
  <div className="nl-mini-heading">AEROMIND</div><Multipliers compact/>
  <div className="nl-mini-radar">RADAR AEROMIND • MONITORAMENTO CONTÍNUO</div>
 </div>;
}
function MiniRose(){
 return <div className="nl-mini-rose" aria-label="Prévia do indicador de minuto de rosa">
  <div className="nl-mini-rose-heading"><Flower size={20}/> Histórico Rosa <span>×</span></div>
  <div className="nl-mini-rose-stats"><span>ÚLTIMA ROSA<br/><b>44.45x</b></span><span>MINUTO MAIS FORTE<br/><b>55m</b></span><span>JANELA<br/><b>13m</b></span></div>
  <div className="nl-mini-rose-highlight"><span>🔥</span><small>MINUTO MAIS FORTE DA HORA</small><strong>55m</strong><em>1x</em></div>
 </div>;
}
function MiniResults(){
 return <div className="nl-mini-results" aria-label="Prévia dos resultados dos indicadores de rosa">
  <div className="nl-mini-results-title">EXPANDIDO 7 <span>⌄</span></div>
  <small>RESUMO DA HORA</small>
  <div className="nl-mini-results-grid">
   <div className="nl-result-win">PLACAR<br/><b>3 WIN • 0 LOSS</b></div>
   <div className="nl-result-pending">PENDENTES<br/><b>1</b></div>
   <div className="nl-result-quality">QUALIDADE HISTÓRICA<br/><b>MÉDIA</b></div>
   <div className="nl-result-closed">ENCERRADOS<br/><b>3</b></div>
  </div>
  <span className="nl-results-button">▦ VER AGENDA COMPLETA ›</span>
 </div>;
}
const items=[
 {id:'crash',icon:'◉',title:'Indicador de Crash',description:'Visualize indicadores de baixa, mediana, alta e alto risco em um único painel.',preview:<MiniCrash/>},
 {id:'rosa',icon:<Flower/>,title:'Indicador de minutos de rosa',description:'Consulte o minuto de maior frequência histórica de rosas, com leitura rápida e clara.',preview:<MiniRose/>},
 {id:'resultados',icon:'▥',title:'Resultados dos indicadores de rosa',description:'Veja placares, pendências e o desempenho registrado dos indicadores de rosa.',preview:<MiniResults/>}
];

export default function Home(){
 return <div className="nl-site">
  <header className="nl-header">
   <div className="nl-header-inner">
    <Link href="/" className="nl-logo" aria-label="AeroMind — início"><AeroMark/><span>AEROMIND</span></Link>
    <nav className="nl-nav" aria-label="Navegação principal">
     <a className="nl-nav-selected" href="#inicio">Início</a>
     <a href="#funcionalidades">Funcionalidades</a>
     <a href="#como-funciona">Como funciona</a>
     <a href="#depoimentos">Depoimentos</a>
     <Link href="/planos">Planos</Link>
    </nav>
    <Link href="/planos" className="nl-btn nl-btn-header">Começar agora <span aria-hidden="true">›</span></Link>
    <details className="nl-mobile-menu">
     <summary aria-label="Abrir menu de navegação"><span/><span/><span/></summary>
     <nav aria-label="Menu mobile"><a href="#inicio">Início</a><a href="#funcionalidades">Funcionalidades</a><a href="#como-funciona">Como funciona</a><a href="#depoimentos">Depoimentos</a><Link href="/planos">Planos e preços</Link><Link href="/entrar">Entrar</Link></nav>
    </details>
   </div>
  </header>
  <main>
   <section className="nl-hero" id="inicio">
    <div className="nl-hero-shape" aria-hidden="true"/>
    <div className="nl-shell nl-hero-content">
     <div className="nl-hero-copy">
      <span className="nl-kicker">SEU ALIADO NO AVIATOR</span>
      <h1>Mais clareza<br/>para suas decisões<br/><span>no Aviator</span></h1>
      <p>O AeroMind monitora, analisa e organiza indicadores em tempo real e histórico inteligente, para você acompanhar cada sessão com mais clareza.</p>
      <div className="nl-hero-buttons">
       <Link href="/planos" className="nl-btn nl-btn-primary"><span aria-hidden="true">ϟ</span> Começar agora <b aria-hidden="true">›</b></Link>
       <a href="#funcionalidades" className="nl-btn nl-btn-secondary"><span aria-hidden="true">▶</span> Ver funcionalidades</a>
      </div>
      <div className="nl-benefits">
       <div><span>▣</span>Visual<br/>profissional</div>
       <div><span>ϟ</span>Leitura<br/>rápida</div>
       <div><span>⚙</span>Interface<br/>intuitiva</div>
       <div><span>▥</span>Mais clareza<br/>na análise</div>
      </div>
     </div>
     <DeviceMockup/>
    </div>
   </section>
   <section className="nl-feature-wrap nl-shell" id="funcionalidades" aria-label="Funcionalidades do AeroMind">
    {items.map((item,i)=><article key={item.id} className={'nl-feature-card nl-feature-'+item.id}>
      <div className="nl-feature-copy"><span className="nl-feature-icon" aria-hidden="true">{item.icon}</span>
       <h2>{item.title}</h2><p>{item.description}</p></div>
      <div className="nl-feature-visual">{item.preview}</div>
    </article>)}
   </section>
   <p className="nl-demo-warning nl-shell">Imagens e multiplicadores ilustrativos para demonstrar a interface. Análises de rodadas anteriores não garantem resultados futuros.</p>
   <section className="nl-simple-section nl-shell" id="como-funciona">
    <span className="nl-section-kicker">SIMPLES DE COMEÇAR</span>
    <h2>Conheça o AeroMind em três passos</h2>
    <div className="nl-steps">
     <div><span>01</span><h3>Escolha seu plano</h3><p>Compare os recursos e selecione o período de acesso.</p></div>
     <div><span>02</span><h3>Acesse o aplicativo</h3><p>Entre na sua conta e conecte-se à plataforma do jogo.</p></div>
     <div><span>03</span><h3>Acompanhe os dados</h3><p>Consulte indicadores, histórico e resultados da sua sessão.</p></div>
    </div>
    <Link href="/planos" className="nl-btn nl-btn-primary nl-bottom-cta">Ver planos e preços <b aria-hidden="true">›</b></Link>
   </section>
   <section id="depoimentos" className="nl-feedback-note nl-shell" aria-label="Depoimentos">
    <div><h2>Construído para uma leitura mais clara.</h2><p>Os depoimentos verificados de clientes serão apresentados aqui quando estiverem disponíveis e autorizados.</p></div>
    <Link href="/planos" className="nl-btn nl-btn-secondary">Conhecer os planos →</Link>
   </section>
  </main>
  <footer className="nl-footer"><div className="nl-shell nl-footer-inner">
   <span><AeroMark small/> AEROMIND</span>
   <p>Monitoramento e análise histórica. Sem promessas de ganho.</p>
   <nav aria-label="Informações legais"><Link href="/planos">Planos</Link><Link href="/entrar">Entrar</Link><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link><Link href="/suporte">Suporte</Link></nav>
  </div></footer>
 </div>;
}
