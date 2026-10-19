import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
export const dynamic='force-dynamic';
export default async function Locate({searchParams}:{searchParams:Promise<{email?:string}>}){
 const {sb}=await requireAdmin();const email=String((await searchParams).email||'').slice(0,320).trim();
 if(!email)redirect('/admin/clientes');
 const {data,error}=await sb.rpc('aeromind_admin_find_customer_by_email',{p_email:email});
 if(error||!data)redirect('/admin/clientes?q='+encodeURIComponent(email));
 redirect('/admin/cliente/'+data);
}
