import Link from 'next/link';
import type {Metadata} from 'next';
import './gold.css';

export const metadata:Metadata={
 title:'AeroMind Gold | Em preparação',
 description:'Conheça as ferramentas planejadas do AeroMind Gold: personalização, comparação prospectiva, simulação e relatórios. Lançamento em preparação.',
 robots:{index:false,follow:false}
};

const features=[
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

export default function GoldInformation(){
 return <div className="ag-page">
  <header className="ag-header">
   <div className="ag-shell ag-nav">
    <Link href="/" className="ag-brand" aria-label="AeroMind início">
     <img src="/images/aeromind-mark.svg" width="43" height="43" alt=""/><strong>AeroMind</strong>
    </Link>
    <nav aria-label="Navegação"><Link href="/">Início</Link><Link href="/planos">Planos atuais</Link><Link href="/contato">Suporte</Link></nav>
    <Link href="/planos" className="ag-pill-link">Ver planos disponíveis <span aria-hidden="true">→</span></Link>
   </div>
  </header>
  <main>
   <section className="ag-hero ag-shell">
    <div className="ag-hero-copy">
     <span className="ag-eyebrow"><span aria-hidden="true">✦</span> CONHEÇA O PRÓXIMO PASSO</span>
     <div className="ag-status"><span className="ag-status-dot"/> GOLD EM PREPARAÇÃO · SEM VENDA ATIVA</div>
     <h1>AeroMind <em>Gold</em></h1>
     <p className="ag-lead">Personalize seus indicadores, compare perfis e acompanhe simulações e relatórios em um único ambiente.</p>
     <p>O Gold está em desenvolvimento. Enquanto isso, os planos existentes e os recursos já contratados continuam independentes e disponíveis conforme sua licença.</p>
     <div className="ag-actions">
      <a href="#recursos" className="ag-cta">Conhecer os recursos <span aria-hidden="true">↓</span></a>
      <Link href="/planos" className="ag-secondary">Ver planos atuais ↗</Link>
     </div>
     <small>18+ · Ferramenta de indicação e análise. Sem garantia de acertos ou ganhos.</small>
    </div>
    <div className="ag-preview" role="img" aria-label="Demonstração ilustrativa dos três perfis, sem resultados reais">
     <div className="ag-preview-top"><span>AEROMIND • CONCEITO GOLD</span><span>✦</span></div>
     <div className="ag-preview-label">PERFIS DE INDICADORES</div>
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
    <div className="ag-section-title"><span>RECURSOS EM DESENVOLVIMENTO</span><h2>Mais controle sobre as suas análises</h2><p>Ferramentas planejadas para personalização e acompanhamento. A liberação depende de testes e integração com o aplicativo.</p></div>
    <div className="ag-features">{features.map(f=><article key={f.name}><span className="ag-icon" aria-hidden="true">{f.icon}</span><h3>{f.name}</h3><p>{f.text}</p></article>)}</div>
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
