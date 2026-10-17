import Link from 'next/link';
import { notFound } from 'next/navigation';
export const dynamicParams = false;
const pages:Record<string,{title:string,desc:string,notice:string}> = {
 "verificar-email":{title:"Verificar e-mail",desc:"Confirmação de identidade da conta AeroMind.",notice:"Será habilitado junto ao sistema de autenticação."},
 "checkout":{title:"Finalizar contratação",desc:"Pagamento seguro após seleção de um plano.",notice:"Checkout desativado. Não envie pagamentos antes da integração oficial."},
 "pagamentos":{title:"Pagamentos",desc:"Recibos e situação da contratação.",notice:"A seção será disponibilizada junto ao provedor de pagamento."},
 "termos":{title:"Termos de uso",desc:"Condições comerciais e regras de utilização do AeroMind.",notice:"Documento jurídico em elaboração. A contratação permanece indisponível."},
 "privacidade":{title:"Política de privacidade",desc:"Informações sobre tratamento de dados e direitos dos usuários.",notice:"Documento em revisão. Antes da coleta de dados pessoais, publicaremos a versão completa conforme a LGPD."},
 "reembolso":{title:"Reembolso e cancelamento",desc:"Política aplicável às futuras compras do AeroMind.",notice:"Política comercial ainda não definida; pagamentos permanecem desativados."},
 "contato":{title:"Fale com o AeroMind",desc:"Entre em contato com a equipe de suporte.",notice:"Escreva para aeromindsuporte@gmail.com para dúvidas sobre o projeto."}
};
export function generateStaticParams(){return Object.keys(pages).map(slug=>({slug}));}
export default async function InternalPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=pages[slug];if(!p)notFound();return <main className="inner"><header className="inner-head"><Link href="/" className="back">← AeroMind</Link><span>ACESSO OFICIAL</span></header><section className="inner-card"><div className="inner-icon">◭</div><h1>{p.title}</h1><p>{p.desc}</p><div className="notice">{p.notice}</div>{slug==="contato"?<a href="mailto:aeromindsuporte@gmail.com" className="button primary big">Enviar e-mail ↗</a>:<Link href="/" className="button primary big">Voltar ao início ↗</Link>}</section><p className="inner-bottom">AeroMind • Desenvolvimento da versão comercial</p></main>}
