import Link from 'next/link';
import {getPublicCampaign} from '@/lib/campaigns';
import {getVisiblePlans,formattedPrice,effectivePriceCents,isFlashActive} from '@/lib/catalog';
import type {Metadata} from 'next';
import './gold.css';

export const dynamic='force-dynamic';
export const metadata:Metadata={
 title:'AeroMind Gold | Alto Risco, Radar Rosa e Comunidade VIP',
 description:'Conheça o Gold: até 7 sinais Rosa por hora, Alto Risco, agenda completa, sinais Premium, suporte prioritário e Comunidade Gold em implantação.',
 robots:{index:true,follow:true}
};

const features=[
 {icon:'🌸',name:'Radar Rosa: até 7 por hora',text:'Acompanhe até sete sinais Rosa por hora, conforme a disponibilidade e a versão do aplicativo.'},
 {icon:'✦',name:'Sinais de Alto Risco',text:'Acesso exclusivo ao card de Alto Risco e seu acompanhamento, conforme a permissão Gold.'},
 {icon:'▦',name:'Agenda completa do dia',text:'Consulte a programação completa dos sinais do dia, exclusiva de assinantes Gold.'},
 {icon:'⚡',name:'Sinais Premium do administrador',text:'Conteúdos e alertas Premium quando enviados e disponibilizados pela administração.'},
 {icon:'◈',name:'Suporte prioritário',text:'Atendimento prioritário da equipe AeroMind para os assinantes do plano Gold.'},
 {icon:'♛',name:'Comunidade Gold VIP',text:'Espaço exclusivo Gold em implantação, com conteúdos e interação entre membros.'},
 {icon:'◎',name:'Lives e análises especiais',text:'Transmissões e estudos de oportunidades com alvos de até 50x, quando programados. Alvos não são garantias de resultados.'},
 {icon:'▥',name:'Tudo do Básico e Pró',text:'Sinais de baixa, média e alta, histórico de rodadas, ranking de casas e ferramentas essenciais.'}
];
const periods=[{days:30,label:'Mensal'},{days:90,label:'Trimestral'},{days:180,label:'Semestral'},{days:365,label:'Anual'}];
const profiles=[
 {label:'Clássico',detail:'Regras originais preservadas. Continuam disponíveis para os clientes com acesso ao app.',access:'Conforme licença atual'},
 {label:'Refinado',detail:'Composição de indicadores e filtros definida na atualização, sem promessa de maior acerto.',access:'Disponibilidade a confirmar'},
 {label:'Gold',detail:'Acesso às funções exclusivas da licença Gold, incluindo Alto Risco, agenda e benefícios Premium.',access:'Licença Gold'}
];
const faqs=[
 ['O Gold garante maior acerto?', 'Não. É um pacote de ferramentas analíticas. Nenhum sinal ou resultado histórico garante acerto ou lucro.'],
 ['Vou perder o meu plano atual?', 'Não. O desenvolvimento Gold não substitui Básico, Pro ou Ultra nem modifica a validade das licenças já existentes.'],
 ['Posso continuar com o Clássico?', 'Sim. As regras originais permanecem disponíveis conforme o acesso contratado.'],
 ['O Gold realiza apostas automáticas?', 'Não. O simulador utiliza exclusivamente banca virtual, e os sinais são informativos.'],
 ['Posso contratar o Gold?', 'Consulte os períodos e preços publicados nesta página. Recursos de comunidade e lives serão disponibilizados conforme a implantação e programação.'],
 ['O que acontece se a permissão Gold vencer?', 'Somente as funções adicionais Gold deixam de estar disponíveis. Seu acesso base continua seguindo a validade da licença existente.']
];

export default async function GoldInformation(){
 const [campaign,plans]=await Promise.all([getPublicCampaign('Gold'),getVisiblePlans()]);
 const offers=plans.filter(p=>p.tier==='Ultra'&&p.slug.startsWith('ultra-'));
 return <div className="ag-page">
  <header className="ag-header">
   <div className="ag-shell ag-nav">
    <Link href="/" className="ag-brand" aria-label="AeroMind início">
     <img src="/images/aeromind-mark.svg" width="43" height="43" alt=""/><strong>AeroMind</strong>
    </Link>
    <nav aria-label="Navegação"><Link href="/">Início</Link><Link href="/planos">Planos atuais</Link><Link href="/contato">Suporte</Link></nav>
    <Link href="/pro" className="ag-pill-link">Conhecer Pro <span aria-hidden="true">→</span></Link>
   </div>
  </header>
  <main>
   <section className="ag-hero ag-shell">
    <div className="ag-hero-copy">
     <span className="ag-eyebrow"><span aria-hidden="true">✦</span> {campaign?.eyebrow||'CONHEÇA O PRÓXIMO PASSO'}</span>
     <div className="ag-status"><span className="ag-status-dot"/> GOLD · ACESSO MAIS COMPLETO</div>
     <h1>AeroMind <em>Gold</em></h1>
     <p className="ag-lead">{campaign?.headline||'Uma nova camada de análise profissional'}</p>
     <p>{campaign?.description||'Tenha acesso às ferramentas Gold e aos benefícios Premium. Comunidade e lives serão disponibilizadas conforme a implantação e programação.'}</p>
     <div className="ag-actions">
      <a href="#periodos" className="ag-cta">Ver preços e períodos <span aria-hidden="true">↓</span></a>
      <Link href="/planos" className="ag-secondary">Ver planos atuais ↗</Link>
     </div>
     <small>18+ · Ferramenta de indicação e análise. Sem garantia de acertos ou ganhos.</small>
    </div>
    <div className="ag-preview" role="img" aria-label="Demonstração ilustrativa dos três perfis, sem resultados reais">
     <div className="ag-preview-top"><span>AEROMIND • CONCEITO GOLD</span><span>✦</span></div>
     <div className="ag-preview-label">RADAR ROSA · COMPARATIVO DOS PLANOS</div>
     <div className="ag-tier-ranks"><div><small>BÁSICO</small><b>CORE 3</b><span>Ranks 1–3</span></div><div><small>PRO</small><b>AMPLIADO 5</b><span>Ranks 1–5</span></div><div className="active"><small>GOLD</small><b>EXPANDIDO 7</b><span>Ranks 1–7</span></div></div>
     <div className="ag-preview-choices"><span>Clássico</span><span>Refinado</span><strong>Gold ◇</strong></div>
     <div className="ag-preview-lines">
      <div><span>BAIXA</span><b>P25 · 35 rodadas</b><small>Personalizável</small></div>
      <div><span>MEDIANA</span><b>P50 · coluna 7</b><small>Regra preservada</small></div>
      <div><span>ALTA</span><b>P75 · 5 / 6 / 7</b><small>Personalizável</small></div>
     </div>
     <div className="ag-preview-footer">DEMONSTRAÇÃO DE INTERFACE · SEM SINAIS AO VIVO</div>
    </div>
   </section>
   <section className="ag-section ag-shell" id="periodos">
    <div className="ag-section-title"><span>ESCOLHA SEU ACESSO GOLD</span><h2>Planos e preços Gold</h2><p>Escolha seu período. O valor promocional é aplicado somente durante a oferta vigente.</p></div>
    <div className="ag-mode-grid">
     {periods.map(({days,label})=>{
      const plan=offers.find(p=>p.duration_days===days);
      return <article key={days} style={{textAlign:'center'}}>
       <span>{label.toUpperCase()}</span>
       <h3>{plan?formattedPrice(effectivePriceCents(plan)):'Indisponível'}</h3>
       <p>{plan&&isFlashActive(plan)?'Oferta de lançamento · preço regular '+formattedPrice(plan.price_cents):plan?'Acesso Gold por '+days+' dias':'Período não publicado'}</p>
       {plan?<Link className="ag-cta" href={'/checkout?plano='+encodeURIComponent(plan.slug)}>Quero ser Gold →</Link>:<span>Consulte outros períodos</span>}
      </article>;
     })}
    </div>
   </section>
   <section id="recursos" className="ag-section ag-shell">
    <div className="ag-section-title"><span>BENEFÍCIOS GOLD</span><h2>Mais ferramentas. Uma experiência exclusiva.</h2><p>O Gold reúne os recursos dos planos anteriores com benefícios exclusivos. Comunidade, lives e análises especiais serão adicionadas conforme disponibilização.</p></div>
    <div className="ag-features">{features.map(f=><article key={f.name}><span className="ag-icon" aria-hidden="true">{f.icon}</span><h3>{f.name}</h3><p>{f.text}</p></article>)}</div>
   </section>
   <section className="ag-section ag-shell">
    <div className="ag-section-title"><span>ACOMPANHAMENTO ESPECIAL</span><h2>Entenda a diferença do Gold</h2><p>Acesso a informações especiais com acompanhamento de sinais. Os resultados são incertos; não há apostas automáticas nem garantia de acerto.</p></div>
    <div className="ag-mode-grid">
     <article><span>EXCLUSIVO GOLD</span><h3>Alto Risco</h3><p>Veja os sinais e a programação exclusiva, com acompanhamento no aplicativo conforme versão e licença.</p></article>
     <article><span>ADMINISTRADOR</span><h3>Sinais Premium</h3><p>Receba os sinais especiais quando publicados pela equipe AeroMind.</p></article>
     <article><span>EM IMPLANTAÇÃO</span><h3>Comunidade e lives VIP</h3><p>Lives e estudos de sinais com alvos de até 50x, quando programados; multiplicadores não são garantidos.</p></article>
    </div>
   </section>
   <section className="ag-section ag-shell">
    <div className="ag-section-title"><span>PERFIS</span><h2>Clássico, Refinado e Gold</h2><p>O Gold não substitui o acesso existente. Novas funções serão liberadas apenas para contas com permissão Gold explícita e licença base válida.</p></div>
    <div className="ag-profiles">{profiles.map(p=><article key={p.label}><h3>{p.label}</h3><p>{p.detail}</p><span>{p.access}</span></article>)}</div>
   </section>
   <section className="ag-section ag-shell">
    <div className="ag-section-title"><span>PERGUNTAS FREQUENTES</span><h2>Informações importantes</h2></div>
    <div className="ag-faq">{faqs.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
   </section>
   <section className="ag-bottom ag-shell"><h2>Quer entrar para o Gold?</h2><p>Escolha o período que combina com você e consulte os valores de lançamento publicados no catálogo.</p><Link className="ag-cta" href="/planos">Comparar todos os planos →</Link></section>
  </main>
  <footer className="ag-footer"><div className="ag-shell">© 2026 AeroMind · Análise e indicação, não apostas automáticas · 18+ · <Link href="/termos">Termos</Link> · <Link href="/privacidade">Privacidade</Link></div></footer>
 </div>;
}
