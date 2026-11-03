import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {AdminActivityFeed} from '@/components/admin/AdminActivityFeed';

export const dynamic='force-dynamic';
export const metadata={
 title:'Atividade em tempo real | AeroMind',
 robots:{index:false,follow:false}
};
export default async function AdminActivityPage(){
 await requireAdmin();
 return <CommercialAdminShell active="/admin/atividade" title="Atividade em tempo real"
  description="Veja imediatamente quem se cadastrou, demonstrou interesse no teste gratuito e ativou seu acesso.">
   <AdminActivityFeed/>
 </CommercialAdminShell>;
}