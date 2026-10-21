
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
  msg==='invalid'?'Dados inválidos. Para publicar gratuitamente, escolha um plano de teste, marque “Teste gratuito (sem Pix)” na aba Preço e confira a duração.':
  msg==='plan-validation'?'O banco rejeitou uma regra do plano. Confira duração, preço, campos de divulgação e o modo Teste gratuito.':
  msg==='plan-permission'?'Sua sessão não possui permissão para editar planos. Faça login novamente com uma conta administradora confirmada.':
  msg==='plan-schema'?'As funções do Supabase estão sendo atualizadas. Atualize a página e tente novamente após alguns instantes.':
  msg==='plan-connection'?'A conexão com o Supabase foi interrompida. Confira sua internet e tente novamente.':
  msg==='plan-missing'?'Esse plano não foi encontrado no catálogo. Recarregue a página.':
  msg==='plan-error'?'Falha ao salvar no Supabase. Nenhum dado foi alterado. Se persistir, informe que ocorreu erro de banco no plano.':
  msg?'Não foi possível salvar. Confira os dados e tente novamente.':'';
 return <CommercialAdminShell title="Planos e divulgação" active="/admin/planos"
  description="Um painel mais simples para configurar, publicar e divulgar seus planos.">
  {feedback&&<p className={'admin-feedback '+(msg==='plan-saved'?'good':'bad')} role="status">{feedback}</p>}
  {error?<p className="admin-feedback bad">O catálogo não pôde ser carregado. Atualize a página ou confira o Supabase. Não foram feitas alterações.</p>:
   <PlansCatalogEditor plans={plans} initialEdit={editar} flash={msg}/>}
 </CommercialAdminShell>;
}
