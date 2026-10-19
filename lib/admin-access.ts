import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export async function requireAdmin(){
 const sb=await createClient();const {data:{user},error}=await sb.auth.getUser();
 if(error||!user)redirect('/entrar?next=%2Fadmin');
 const {data:staff,error:staffError}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
 if(staffError||!staff)redirect('/minha-conta');
 return {sb,user,role:staff.role as string};
}
