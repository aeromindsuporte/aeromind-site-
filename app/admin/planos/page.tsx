
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {PlansCatalogEditor,type Plan} from '@/components/admin/PlansCatalogEditor';
import './plans-v2.css';
export const dynamic='force-dynamic';

export default async function AdminPlans({searchParams}:{searchParams:Promise<{msg?:string,editar?:string}>}){
 const {sb}=await requireAdmin();
 const {msg,editar}=await searchParams;
 const {data,error}=await sb.rpc('aeromind_admin_all_plans');
 const plans=(Array.isArray(data)?data:[]) as Plan[];
 const feedback=msg==='plan-saved'?'Alterações salvas no Supabase. Os novos dados já estão disponíveis nas páginas de vendas.':
  msg==='price'?'Para publicar, use R$ 2,00 ou mais no Pix. Para um teste gratuito, marque “Teste gratuito (sem Pix)” e publique por R$ 0,00.':
  msg==='free-select'?'Para publicar um teste sem cobrança, abra a aba Preço e marque “Teste gratuito (sem Pix)”.':
  msg==='no-permission'?'Não foi possível validar sua permissão administrativa. Entre novamente na conta administradora.':
  msg==='invalid'?'Confira preço, duração e textos informados. O teste gratuito deve ter valor zero e duração entre 1 e 72 horas ou entre 1 e 30 dias.':
  msg?'Não foi possível confirmar o salvamento. Se o erro continuar, consulte o suporte com o tipo do plano, sem enviar senhas.':'';
 return <CommercialAdminShell title="Planos e divulgação" active="/admin/planos"
  description="Um painel mais simples para configurar, publicar e divulgar seus planos.">
  {feedback&&<p className={'admin-feedback '+(msg==='plan-saved'?'good':'bad')} role="status">{feedback}</p>}
  {error?<p className="admin-feedback bad">O catálogo não pôde ser carregado. Atualize a página ou confira o Supabase. Não foram feitas alterações.</p>:
   <PlansCatalogEditor plans={plans} initialEdit={editar} flash={msg}/>}
 </CommercialAdminShell>;
}
