import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {FeedbackInbox} from '@/components/feedback/FeedbackInbox';
import type {FeedbackItem} from '@/components/feedback/FeedbackForm';
export const dynamic='force-dynamic';
export const metadata={title:'Sugestões e feedback — AeroMind ADM',robots:{index:false,follow:false}};
export default async function FeedbackAdmin(){
 const {sb}=await requireAdmin();
 const {data,error}=await sb.from('aeromind_feedback')
  .select('id,user_id,category,title,message,rating,status,admin_reply,created_at,updated_at')
  .order('created_at',{ascending:false}).limit(200);
 return <CommercialAdminShell title="Sugestões e feedback" active="/admin/feedback"
  description="Ouça seus usuários, descubra melhorias e responda às ideias que vão moldar o AeroMind.">
   <FeedbackInbox initial={(data||[]) as FeedbackItem[]} loadError={Boolean(error)}/>
 </CommercialAdminShell>;
}
