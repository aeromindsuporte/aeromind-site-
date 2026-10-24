import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {GoldComparisonWorkbench} from '@/components/gold/GoldComparisonWorkbench';
import {REFINED_DEFAULT,validateGoldSettings,type Settings} from '@/lib/gold/indicators';
import './comparator.css';

export const dynamic='force-dynamic';
export const metadata={title:'Gold · Comparador offline | AeroMind',robots:{index:false,follow:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminGoldComparator({searchParams}:{
 searchParams:Promise<{cliente?:string}>
}){
 const {sb,role}=await requireAdmin();
 if(role!=='admin'&&role!=='owner')redirect('/admin');
 const {cliente}=await searchParams;
 const customerId=cliente&&uuid.test(cliente)?cliente:null;
 const [configResult,customerResult]=customerId?await Promise.all([
  sb.from('aeromind_gold_config_versions').select('settings,version').eq('user_id',customerId).order('version',{ascending:false}).limit(1).maybeSingle(),
  sb.rpc('aeromind_admin_customer_v3',{p_user_id:customerId})
 ]):[null,null];
 const badClient=!!(cliente&&!customerId)||!!(customerId&&(!customerResult?.data||customerResult?.error));
 const readError=!!(customerId&&configResult?.error);
 const hasCustom=!!(configResult?.data?.settings&&validateGoldSettings(configResult.data.settings));
 const settings:Settings=hasCustom?configResult!.data!.settings as Settings:REFINED_DEFAULT as Settings;
 const name=customerResult?.data?.email;
 const configLabel=hasCustom?'Cliente '+String(name||'selecionado')+' · versão '+configResult?.data?.version:
  'Refinado padrão (sem personalização do cliente)';
 return <CommercialAdminShell active="/admin/gold" title="Gold · Comparador"
  description="Análise sequencial em laboratório, isolada de pagamentos, licenças e execução no aplicativo.">
  <div className="gold-comparator-page">
   <div className="gold-compare-breadcrumb"><Link href="/admin/gold">← Gerenciamento Gold</Link>
    <Link href="/admin/relatorios">Relatórios gerais ↗</Link></div>
   {badClient?<section className="admin-card"><p className="admin-feedback bad">O cliente selecionado não existe ou não pode ser consultado.</p><Link href="/admin/gold">Selecionar outro cliente →</Link></section>:
    readError?<section className="admin-card"><p className="admin-feedback bad">Não foi possível carregar os parâmetros Gold. A comparação foi bloqueada para evitar usar configurações incorretas.</p></section>:
    <GoldComparisonWorkbench settings={settings} configLabel={customerId?configLabel:'Padrão Refinado (sem cliente selecionado)'}/>}
  </div>
 </CommercialAdminShell>;
}
