import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
export const dynamicParams=false;
const pages:Record<string,{title:string;description:string}>={
 'verificar-email':{title:'Verificar e-mail',description:'Orientações para confirmar o cadastro AeroMind.'},
 'termos':{title:'Termos de uso',description:'Condições de uso e contratação dos planos AeroMind.'},
 'privacidade':{title:'Política de privacidade',description:'Informações sobre dados pessoais, finalidades e direitos no AeroMind.'},
 'reembolso':{title:'Cancelamento e reembolso',description:'Como solicitar cancelamento e exercer o direito de arrependimento.'},
 'contato':{title:'Fale com o AeroMind',description:'Canais de atendimento ao cliente.'}
};
export function generateStaticParams(){return Object.keys(pages).map(slug=>({slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;
 return {title:pages[slug]?.title+' | AeroMind'||'AeroMind',description:pages[slug]?.description||'Informações AeroMind'};
}
const Support=()=> <a href="mailto:aeromindsuporte@gmail.com">aeromindsuporte@gmail.com</a>;
function Content({slug}:{slug:string}){
 switch(slug){
 case 'termos':return <>
  <h2>1. Sobre o AeroMind</h2>
  <p>O AeroMind é um serviço digital de acompanhamento de rodadas, histórico, indicadores e sinais relacionados ao jogo Aviator. Não recebe apostas, não controla os resultados dos jogos e não garante previsões corretas, multiplicadores, lucros ou recuperação de perdas. O serviço é destinado exclusivamente a maiores de 18 anos.</p>
  <h2>2. Cadastro e acesso</h2>
  <p>Para usar recursos vinculados à licença, o cliente cria uma conta, confirma o e-mail quando solicitado e utiliza suas próprias credenciais. O acesso exige licença válida; o cadastro, por si só, não ativa plano pago. O cliente deve preservar sua senha e informar o suporte sobre acessos suspeitos.</p>
  <h2>3. Planos, períodos e limitações</h2>
  <p>Os planos e valores aplicáveis são os publicados na <Link href="/planos">página de planos</Link> no momento da compra. Os períodos mensais, trimestrais, semestrais e anuais possuem duração informada em cada oferta. Promoções só se aplicam enquanto estiverem vigentes. A quantidade de sinais Rosa anunciada é um limite de acesso, não uma promessa de sinais em toda hora.</p>
  <p>O Alto Risco e a agenda completa são benefícios exclusivos da licença Gold. Comunidade VIP, lives e conteúdos especiais identificados como <strong>em implantação</strong> podem não estar disponíveis imediatamente; consulte a descrição do plano antes da contratação.</p>
  <h2>4. Pagamento e disponibilização</h2>
  <p>O pagamento é processado por Pix com um provedor de pagamentos externo. A licença somente é ativada quando o servidor confirma o pagamento, vinculando valor, referência e transação ao pedido. Se houver pagamento realizado e acesso não liberado, consulte <Link href="/pagamentos">Meus pagamentos</Link> ou solicite atendimento; não repita a cobrança sem confirmação.</p>
  <h2>5. Uso responsável</h2>
  <p>Os sinais e relatórios têm caráter informativo e não são recomendação financeira. Decisões de aposta são de responsabilidade do usuário. Não use valores essenciais à subsistência e respeite as regras legais aplicáveis. É proibido compartilhar credenciais, tentar burlar licenças, explorar falhas ou usar o sistema de modo ilícito.</p>
  <h2>6. Atendimento, privacidade e cancelamentos</h2>
  <p>Consulte a <Link href="/privacidade">Política de Privacidade</Link> e as orientações de <Link href="/reembolso">Reembolso e Cancelamento</Link>. Para suporte, dúvidas contratuais ou problemas de acesso: <Support/>.</p>
  <h2>7. Identificação do fornecedor</h2>
  <p>Canal comercial: AeroMind, pelo e-mail <Support/>. <strong>Pendente de complementação pela administração:</strong> nome civil/empresarial, CPF/CNPJ quando aplicável e endereço físico do responsável pela oferta. Esses dados precisam constar publicamente antes da divulgação comercial em larga escala.</p>
 </>;
 case 'privacidade':return <>
  <h2>1. Dados envolvidos</h2>
  <p>Para cadastrar e prestar o serviço, o AeroMind utiliza dados informados pelo cliente, como nome, e-mail e WhatsApp. Também podem ser registrados identificadores técnicos de sessão e dispositivo, licenças, downloads, suporte, notificações, histórico de acessos e informações dos pedidos. Na contratação via Pix, nome e CPF/CNPJ do pagador são encaminhados ao provedor de pagamento para processar a cobrança.</p>
  <h2>2. Para que usamos os dados</h2>
  <p>As finalidades incluem: criar e proteger contas; autenticar o aplicativo; liberar e conferir licenças; processar e conciliar pagamentos; disponibilizar downloads; responder solicitações; prevenir fraudes; atender obrigações legais. Ofertas por WhatsApp dependem da opção de recebimento indicada no cadastro e podem ser interrompidas mediante solicitação.</p>
  <h2>3. Fornecedores e compartilhamento</h2>
  <p>O site utiliza serviços externos de infraestrutura e autenticação/banco de dados, incluindo Vercel e Supabase. Pagamentos Pix podem envolver a PaggOne. Os dados necessários à operação são transmitidos a esses prestadores para as finalidades descritas; não é necessário informar senha bancária ao AeroMind.</p>
  <h2>4. Sessões e segurança</h2>
  <p>O site usa cookies e armazenamento técnico para manter a autenticação e preferências, como o e-mail lembrado, quando habilitado. O acesso a funções restritas depende de autenticação e validações no servidor. Nenhuma plataforma é imune a falhas, e incidentes suspeitos podem ser comunicados pelo canal de suporte.</p>
  <h2>5. Conservação e direitos do titular</h2>
  <p>Os registros podem ser conservados pelo tempo necessário à prestação do serviço, proteção das contas e cumprimento das obrigações legais aplicáveis. Nos termos da LGPD, você pode solicitar informações sobre tratamento, acesso, correção e demais direitos legalmente previstos, incluindo exclusão quando cabível.</p>
  <h2>6. Atendimento de privacidade</h2>
  <p>Para acesso, correção, exclusão de dados, oposição a mensagens promocionais ou dúvidas, escreva para <Support/> informando o e-mail cadastrado e o tipo de solicitação. Não envie senhas ou dados bancários ao atendimento. Identificação jurídica do responsável e contato físico ainda precisam ser complementados na página pública pelo operador comercial.</p>
 </>;
 case 'reembolso':return <>
  <h2>Direito de arrependimento</h2>
  <p>Para contratações feitas pela internet, o consumidor poderá exercer o direito de arrependimento no prazo legal de <strong>7 dias</strong>, observado o art. 49 do Código de Defesa do Consumidor. O pedido não exige justificativa. Os valores são restituídos de acordo com as regras legais aplicáveis.</p>
  <h2>Como solicitar</h2>
  <p>Envie um e-mail para <Support/> com o assunto <strong>Cancelamento AeroMind</strong> e informe o e-mail da sua conta, o plano e a referência do pedido, se disponível. Não é necessário compartilhar senha nem código Pix. O suporte poderá solicitar apenas informações necessárias para localizar a compra e efetuar a restituição de forma segura.</p>
  <h2>Falhas de entrega e problemas técnicos</h2>
  <p>Se um pagamento foi confirmado e a licença não foi disponibilizada, entre em contato com o suporte antes de gerar outra cobrança. Situações de falha de serviço ou divergência da oferta serão avaliadas sem prejuízo dos demais direitos previstos na legislação de consumo.</p>
  <h2>Cancelamento e validade da licença</h2>
  <p>Cada oferta informa o período de acesso contratado. O encerramento do acesso por término do prazo não substitui os direitos legais de cancelamento. Para esclarecimentos sobre licenças, valores e disponibilização do aplicativo, consulte <Link href="/planos">Planos</Link> e <Link href="/suporte">Suporte</Link>.</p>
 </>;
 case 'verificar-email':return <>
  <h2>Confirme seu endereço de e-mail</h2>
  <p>Após criar a conta, confira a caixa de entrada e a pasta de spam. Clique no link de confirmação enviado pelo serviço de autenticação para validar seu cadastro.</p>
  <p>Se não recebeu a mensagem ou se o link expirou, entre em contato com <Support/> para orientações. Não compartilhe senhas ou códigos de acesso.</p>
  <Link href="/entrar" className="button primary big">Voltar ao login ↗</Link>
 </>;
 default:return <>
  <h2>Atendimento AeroMind</h2>
  <p>Entre em contato para dúvidas sobre planos, compras, acesso, dispositivos, suporte técnico, cancelamentos ou dados pessoais.</p>
  <p>E-mail oficial: <Support/></p>
  <p>Se você já tem uma conta, use também o <Link href="/suporte">chat da central de suporte</Link>.</p>
  <a href="mailto:aeromindsuporte@gmail.com" className="button primary big">Enviar e-mail ↗</a>
 </>;
 }
}
export default async function InternalPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,p=pages[slug];if(!p)notFound();
 return <main className="inner"><header className="inner-head">
  <Link href="/" className="back">← AeroMind</Link><span>INFORMAÇÕES OFICIAIS</span>
 </header><section className="inner-card" style={{maxWidth:900}}>
  <div className="inner-icon" aria-hidden="true">◭</div>
  <h1>{p.title}</h1><p>{p.description}</p>
  {slug!=='contato'&&slug!=='verificar-email'&&<p className="legal-updated">Informações revisadas em 01/11/2026. Direitos legais do consumidor e do titular de dados são preservados.</p>}
  <div className="legal-content"><Content slug={slug}/></div>
  <nav className="legal-links" aria-label="Outras informações">
   <Link href="/planos">Planos e preços</Link>
   <Link href="/termos">Termos</Link>
   <Link href="/privacidade">Privacidade</Link>
   <Link href="/reembolso">Reembolso</Link>
   <Link href="/contato">Contato</Link>
  </nav>
 </section><p className="inner-bottom">AeroMind · Suporte: aeromindsuporte@gmail.com</p></main>;
}
