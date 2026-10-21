
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
  msg==='price'?'É necessário definir pelo menos R$ 2,00 para publicar um plano.':
  msg==='invalid'?'Confira o preço, a duração e os textos informados. Nenhuma alteração foi aplicada.':
  msg?'Não foi possível salvar. Confira o plano e tente novamente.':'';
 return <CommercialAdminShell title="Planos e divulgação" active="/admin/planos"
  description="Um painel mais simples para configurar, publicar e divulgar seus planos.">
  {feedback&&<p className={'admin-feedback '+(msg==='plan-saved'?'good':'bad')} role="status">{feedback}</p>}
  {error?<p className="admin-feedback bad">O catálogo não pôde ser carregado. Atualize a página ou confira o Supabase. Não foram feitas alterações.</p>:
   <PlansCatalogEditor plans={plans} initialEdit={editar}/>}
 </CommercialAdminShell>;
}
