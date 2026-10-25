import Link from 'next/link';
import {getPublicCampaigns} from '@/lib/campaigns';
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

/** Um avião de hélice consistente nas duas demonstrações da landing. */
function AeroMindPlaneArt(){
 return <g strokeLinecap="round" strokeLinejoin="round">
  {/* Estabilizadores traseiros */}
  <path d="M50 72 27 46 39 42 79 65 84 75Z" fill="#75002E" stroke="#FB1A76" strokeWidth="2.4"/>
  <path d="M49 79 18 103 32 108 84 85 89 75Z" fill="#800433" stroke="#FB1A76" strokeWidth="2.4"/>
  {/* Asas com nervuras */}
  <path d="M104 63 91 14 Q90 10 96 11 L110 12 161 56 153 70Z" fill="#B10447" stroke="#FF328D" strokeWidth="2.6"/>
  <path d="M106 72 80 113 Q77 119 83 119 L101 116 162 72 153 66Z" fill="#B9044E" stroke="#FF328D" strokeWidth="2.6"/>
  {/* Fuselagem e reflexos */}
  <path d="M24 76 C46 68 70 64 101 61 L197 46 Q211 42 217 49 L223 53 Q227 59 216 64 C174 73 127 81 83 85 L24 86 Q12 84 24 76Z" fill="#C5054B" stroke="#FF3A92" strokeWidth="2.8"/>
  <path d="M31 77 C71 68 146 61 202 52" stroke="#FF8AB6" strokeWidth="2" fill="none"/>
  <path d="M38 83 C102 83 165 72 202 63" stroke="#F51A77" strokeWidth="1.3" fill="none"/>
  {/* Cabine com janelas */}
  <path d="M149 59 Q156 43 172 44 Q184 44 190 52 Q183 61 168 64 L148 67Z" fill="#131A37" stroke="#FF70B3" strokeWidth="2.3"/>
  <path d="M164 46 160 62 M173 46 175 59" stroke="#FF6DAC" strokeWidth="1.5" fill="none"/>
  <path d="M99 18 136 57 M110 28 146 60 M94 107 139 75 M102 111 147 77" stroke="#FC5C9E" strokeWidth="1.45" fill="none" opacity=".7"/>
  {/* Motor, spinner e hélice */}
  <path d="M214 48 Q221 51 223 54 Q225 61 217 64" fill="#FD3E89" stroke="#FF8CBA" strokeWidth="2"/>
  <ellipse cx="225" cy="55" rx="3.6" ry="4.1" fill="#FFADC9"/>
  <path d="M227 30 Q222 43 226 55 Q223 70 227 83" stroke="#FF1D80" strokeWidth="4" fill="none"/>
  <path d="M227 30 Q222 43 226 55 Q223 70 227 83" stroke="#FFC0DF" strokeWidth="1.4" fill="none"/>
 </g>;
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
  <g transform="translate(380 2) scale(.50)">
   <g transform="rotate(-17 120 60)"><AeroMindPlaneArt/></g>
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
 return <div className="nl-stage nl-stage-real" aria-label="Ilustração demonstrativa da interface AeroMind no celular">
  <div className="nl-stage-halo" aria-hidden="true"/>
  <div className="nl-stage-bars" aria-hidden="true"><span/><span/><span/><span/><span/></div>
  <svg className="nl-plane-decoration" width="240" height="150" viewBox="0 0 240 150" aria-hidden="true" fill="none">
   <g transform="translate(0 13) rotate(-10 120 60)"><AeroMindPlaneArt/></g>
  </svg>
  <img className="nl-phone-real" src="/images/aeromind-phone-real.avif"
   alt="Prévia ilustrativa do AeroMind em um celular com indicadores BAIXA, MEDIANA, ALTA, ALTO RISCO, radar e gráfico Aviator."
   width="395" height="702" decoding="async" fetchPriority="high"/>
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

export default async function Home(){
 const campaigns=await getPublicCampaigns();
 return <div className="nl-site">
  <header className="nl-header">
   <div className="nl-header-inner">
    <Link href="/" className="nl-logo" aria-label="AeroMind — início"><img src="/images/aeromind-mark.svg" alt="" width="65" height="55" className="nl-logo-img"/><span>AEROMIND</span></Link>
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
      <div className="nl-trial-cta">
       <Link href="/teste-gratis?plano=teste-horas" className="nl-btn nl-btn-trial" aria-label="TESTE GRÁTIS — iniciar teste do AeroMind">
        <span className="nl-btn-trial-icon" aria-hidden="true">🎁</span><strong>TESTE GRÁTIS</strong><span className="nl-btn-trial-arrow" aria-hidden="true">›</span>
       </Link>
      </div>
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
   <section className="nl-campaigns nl-shell" id="versoes" aria-label="Conheça AeroMind Pro e Gold">
    <div className="nl-campaigns-intro"><span>EVOLUÇÃO AEROMIND AURORA</span><h2>Conheça os próximos níveis</h2>
     <p>O aplicativo atual continua disponível conforme sua licença. Os recursos novos abaixo estão planejados para a atualização Aurora e não são promessas de desempenho.</p></div>
    <div className="nl-campaign-grid">
     {campaigns.filter(c=>c.tier==='Pro'||c.tier==='Gold').map(c=><article className={'nl-campaign-card '+(c.tier==='Gold'?'gold':'pro')} key={c.tier}>
       <span className="nl-campaign-badge">{c.badge}</span>
       <h3>AeroMind {c.tier}</h3><h4>{c.headline}</h4>
       <p>{c.description}</p>
       <ul>{c.features.slice(0,4).map((item,i)=><li key={i}>✓ {item}</li>)}</ul>
       <p className="nl-campaign-availability">{c.tier==='Gold'?'Em preparação · venda Gold não disponível':'Ofertas Pro dependem de preço e publicação no catálogo'}</p>
       <Link href={c.tier==='Gold'?'/gold':'/pro'} className="nl-campaign-action">{c.cta_text} →</Link>
     </article>)}
    </div>
   </section>
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
  </div>
  <div className="nl-shell nl-responsibility-footer">
   <aside className="nl-responsibility-notice" aria-label="Aviso de idade mínima e riscos">
    <strong className="nl-responsibility-age">18+</strong>
    <p>O jogo é destinado a maiores de 18 anos. O AeroMind é um sistema de indicação e análise de dados; <strong>não há garantia de acertos ou ganhos.</strong> Jogue com responsabilidade.</p>
   </aside>
  </div></footer>
 </div>;
}
