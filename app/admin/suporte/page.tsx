import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {SupportAdminChat} from '@/components/support/SupportAdminChat';
export const dynamic='force-dynamic';
export const metadata={title:'Chat de Suporte — AeroMind ADM',robots:{index:false,follow:false}};
export default async function SupportAdmin({searchParams}:{searchParams:Promise<{ticket?:string}>}){
 await requireAdmin();
 const params=await searchParams;
 return <CommercialAdminShell title="Chat de suporte" active="/admin/suporte"
  description="Converse diretamente com clientes, veja mensagens não lidas e acompanhe atendimentos em uma caixa de entrada.">
  <SupportAdminChat initialTicket={params.ticket}/>
 </CommercialAdminShell>;
}
