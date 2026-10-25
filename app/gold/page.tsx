import Link from 'next/link';
import {getPublicCampaign} from '@/lib/campaigns';
import type {Metadata} from 'next';
import './gold.css';

export const dynamic='force-dynamic';
export const metadata:Metadata={
 title:'AeroMind Gold | Conheça os recursos Aurora',
 description:'Conheça as ferramentas planejadas do AeroMind Gold: personalização, comparação prospectiva, simulação e relatórios. Lançamento em preparação.',
 robots:{index:false,follow:false}
};

const features=[
 {icon:'✦',name:'Radar Rosa EXPANDIDO 7',text:'Os sete ranks do Radar V4 estarão disponíveis no plano Gold da atualização Aurora, após testes e integração da APK.'},
 {icon:'◎',name:'Gold Rosa 10x — 2 observações',text:'Módulo experimental para ranks 4–5 e até duas observações por sinal; relatório próprio, sem execução automática de apostas.'},
 {icon:'◈',name:'Gold Rosa 10x — 8 observações',text:'Módulo experimental com ranks 1–7 e até oito observações por janela. O lucro histórico não garante resultados futuros.'},
 {icon:'◈',name:'Indicadores personalizados',text:'Escolha regras de BAIXA e ALTA dentre opções definidas, com configurações separadas por indicador.'},
 {icon:'⇄',name:'Comparador prospectivo',text:'Observe Clássico, Refinado e Gold no mesmo período, sem fabricar sinais anteriores ao início.'},
 {icon:'◎',name:'Simulador de gestão',text:'Experimente cenários com banca virtual, limites, metas e métricas de risco. Sem executar apostas reais.'},
 {icon:'▥',name:'Relatórios avançados',text:'Consulte revisões, filtros, amostras e histórico, com exportação rastreável.'},
 {icon:'✦',name:'Alertas personalizados',text:'Configure avisos de oportunidades válidas dos indicadores escolhidos, respeitando sessão e conectividade.'}
];
const profiles=[
 {label:'Clássico',detail:'Regras originais preservadas. Continuam disponíveis para os clientes com acesso ao app.',access:'Conforme licença atual'},
 {label:'Refinado',detail:'Composição de indicadores e filtros definida na atualização, sem promessa de maior acerto.',access:'Disponibilidade a confirmar'},
 {label:'Gold',detail:'Começa pelo padrão Refinado e acrescenta personalização e ferramentas de análise.',access:'Em preparação'}
];
const faqs=[
 ['O Gold garante maior acerto?', 'Não. É um pacote de ferramentas analíticas. Nenhum sinal ou resultado histórico garante acerto ou lucro.'],
 ['Vou perder o meu plano atual?', 'Não. O desenvolvimento Gold não substitui Básico, Pro ou Ultra nem modifica a validade das licenças já existentes.'],
 ['Posso continuar com o Clássico?', 'Sim. As regras originais permanecem disponíveis conforme o acesso contratado.'],
 ['O Gold realiza apostas automáticas?', 'Não. O simulador utiliza exclusivamente banca virtual, e os sinais são informativos.'],
 ['Quando estará disponível para compra?', 'A venda será liberada somente depois que o aplicativo e os serviços estiverem implementados e testados. Não existe preço Gold publicado nesta página.'],
 ['O que acontece se a permissão Gold vencer?', 'Somente as funções adicionais Gold deixam de estar disponíveis. Seu acesso base continua seguindo a validade da licença existente.']
];

export default async function GoldInformation(){
 const campaign=await getPublicCampaign('Gold');
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
     <div className="ag-status"><span className="ag-status-dot"/> GOLD EM PREPARAÇÃO · SEM VENDA ATIVA</div>
     <h1>AeroMind <em>Gold</em></h1>
     <p className="ag-lead">{campaign?.headline||'Uma nova camada de análise profissional'}</p>
     <p>{campaign?.description||'O Gold está em desenvolvimento. Enquanto isso, os recursos já contratados continuam conforme sua licença.'}</p>
     <div className="ag-actions">
      <a href="#recursos" className="ag-cta">{campaign?.cta_text||'Conhecer os recursos'} <span aria-hidden="true">↓</span></a>
      <Link href="/planos" className="ag-secondary">Ver planos atuais ↗</Link>
     </div>
     <small>18+ · Ferramenta de indicação e análise. Sem garantia de acertos ou ganhos.</small>
    </div>
    <div className="ag-preview" role="img" aria-label="Demonstração ilustrativa dos três perfis, sem resultados reais">
     <div className="ag-preview-top"><span>AEROMIND • CONCEITO GOLD</span><span>✦</span></div>
     <div className="ag-preview-label">RADAR AEROMIND AURORA · RECURSOS PLANEJADOS</div>
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
   <section id="recursos" className="ag-section ag-shell">
    <div className="ag-section-title"><span>RECURSOS EM DESENVOLVIMENTO</span><h2>O próximo nível do AeroMind</h2><p>Ferramentas planejadas para personalização e acompanhamento. A liberação depende de testes e integração com o aplicativo.</p></div>
    <div className="ag-features">{(campaign?campaign.features.map((x,i)=>({icon:['✦','◎','◈','▥','⇄','◇'][i],name:x,text:'Funcionalidade planejada para a atualização Aurora; disponível após integração e validação técnica.'})):features).map(f=><article key={f.name}><span className="ag-icon" aria-hidden="true">{f.icon}</span><h3>{f.name}</h3><p>{f.text}</p></article>)}</div>
   </section>
   <section className="ag-section ag-shell">
    <div className="ag-section-title"><span>SELEÇÃO ALTO RISCO</span><h2>Três modos, históricos separados</h2><p>Não substituiremos o Alto Risco existente. Cada modo Gold terá avaliação e placar próprios. Ainda não há apostas automáticas nem modo Gold operacional na APK.</p></div>
    <div className="ag-mode-grid">
     <article><span>ORIGINAL</span><h3>Atual</h3><p>Funcionamento do Alto Risco preservado conforme licença existente.</p></article>
     <article><span>GOLD · EXPERIMENTAL</span><h3>Rosa 10x · 2 Rodadas</h3><p>Ranks 4–5, até 2 observações, sem usar informações da rodada futura.</p></article>
     <article><span>GOLD · EXPERIMENTAL</span><h3>Rosa 10x · 8 Rodadas</h3><p>Ranks 1–7, até 8 observações. Resultados históricos não asseguram lucros.</p></article>
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
   <section className="ag-bottom ag-shell"><h2>Quer começar com o AeroMind?</h2><p>Conheça os planos já disponíveis. O Gold continua em preparação, sem contratação ou cobrança nesta página.</p><Link className="ag-cta" href="/planos">Consultar planos atuais →</Link></section>
  </main>
  <footer className="ag-footer"><div className="ag-shell">© 2026 AeroMind · Análise e indicação, não apostas automáticas · 18+ · <Link href="/termos">Termos</Link> · <Link href="/privacidade">Privacidade</Link></div></footer>
 </div>;
}
