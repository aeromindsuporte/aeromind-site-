import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';

export const dynamic='force-dynamic';
export const metadata={title:'Preparação Gold | Administração AeroMind',robots:{index:false,follow:false}};

export default async function AdminGold(){
 await requireAdmin();
 return <CommercialAdminShell title="AeroMind Gold" active="/admin/gold"
  description="Preparação do novo pacote sem interromper licenças, cobrança ou funções dos planos atuais.">
  <section className="admin-card" aria-label="Estado da implantação Gold">
   <h2>Gold em preparação</h2>
   <p className="admin-card-explain">A oferta Gold ainda não está publicada para compra. Não existe ativação automática por usar o termo Premium ou uma licença Pro.</p>
   <p className="admin-card-explain"><strong>Proteção da operação:</strong> Básico, Pro, Ultra, Pix, testes grátis, dispositivos, notificações e funcionalidades do aplicativo permanecem independentes do futuro Gold.</p>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:18}}>
    <Link href="/gold" className="admin-inline-action">Ver apresentação Gold →</Link>
    <Link href="/admin/planos" className="admin-inline-action">Administrar planos atuais →</Link>
    <Link href="/admin/licencas" className="admin-inline-action">Gerenciar licenças existentes →</Link>
   </div>
  </section>
  <section className="admin-card" aria-label="Próximas integrações">
   <h2>Controles a conectar ao banco</h2>
   <p className="admin-card-explain">Na próxima integração serão incluídos cadastro de produto Gold, concessão e revogação auditáveis, prazo, configurações versionadas e vínculo seguro com pagamentos confirmados.</p>
   <p className="admin-card-explain">Essas ações <strong>não foram ativadas</strong> neste painel enquanto não houver ambiente isolado de homologação e estrutura de autorização validada.</p>
  </section>
 </CommercialAdminShell>;
}
