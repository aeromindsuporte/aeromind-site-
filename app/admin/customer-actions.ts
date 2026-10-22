'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
import {normalizeWhatsAppBR} from '@/lib/whatsapp';

const text=(data:FormData,name:string)=>
 typeof data.get(name)==='string'?(data.get(name) as string).trim():'';
const validUUID=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const back=(id:string,message:string)=>'/admin/cliente/'+id+'?msg='+message;
async function admin(){
 const {sb}=await requireAdmin();
 return sb;
}
export async function saveCustomerContact(form:FormData){
 const sb=await admin();const id=text(form,'customer_id');
 if(!validUUID(id))redirect('/admin/clientes?msg=invalid');
 const name=text(form,'display_name'),phone=text(form,'whatsapp');
 const formatted=phone?normalizeWhatsAppBR(phone):null;
 if(name.length<2||name.length>120||(phone&&!formatted))
  redirect(back(id,'contact-invalid'));
 const {data,error}=await sb.rpc('aeromind_admin_update_customer_contact_v3',{
  p_customer_id:id,p_name:name,p_whatsapp:formatted||''
 });
 if(error||data!==true)redirect(back(id,'contact-error'));
 revalidatePath(back(id,'').split('?')[0]);revalidatePath('/minha-conta');
 redirect(back(id,'contact-saved'));
}
export async function addCustomerNote(form:FormData){
 const sb=await admin();const id=text(form,'customer_id');
 if(!validUUID(id))redirect('/admin/clientes?msg=invalid');
 const note=text(form,'note');
 if(!note||note.length>2000)redirect(back(id,'note-invalid'));
 const {data,error}=await sb.rpc('aeromind_admin_add_customer_note_v3',{p_customer_id:id,p_note:note});
 if(error||data!==true)redirect(back(id,'note-error'));
 revalidatePath('/admin/cliente/'+id);
 redirect(back(id,'note-saved'));
}
export async function renewCustomerLicense(form:FormData){
 const sb=await admin();const id=text(form,'customer_id');
 if(!validUUID(id))redirect('/admin/clientes?msg=invalid');
 const days=Number(text(form,'days')),tier=text(form,'tier'),note=text(form,'note');
 const confirmation=text(form,'confirmation')==='yes';
 if(!confirmation||!Number.isInteger(days)||days<1||days>365||
    !['Básico','Pro','Ultra'].includes(tier)||note.length>500)
  redirect(back(id,'renew-invalid'));
 const {data,error}=await sb.rpc('aeromind_admin_renew_customer_v3',{
  p_customer_id:id,p_days:days,p_plan:tier,p_note:note
 });
 if(error||!data){
  console.error('aeromind_customer_renew_error',{code:error?.code||'no-data'});
  redirect(back(id,'renew-error'));
 }
 revalidatePath('/admin/cliente/'+id);
 revalidatePath('/admin/clientes');
 revalidatePath('/admin/licencas');
 revalidatePath('/minha-conta');
 redirect(back(id,'renew-saved'));
}
