'use server';

import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';

export async function activateFreeTrial(formData:FormData){
 const slug=String(formData.get('plan')||'');
 if(slug!=='teste-horas'&&slug!=='teste-dias')redirect('/planos');
 const back='/teste-gratis?plano='+encodeURIComponent(slug);
 const sb=await createClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/entrar?next='+encodeURIComponent(back));
 if(!user.email_confirmed_at)redirect(back+'&erro=email');
 const {data,error}=await sb.rpc('aeromind_claim_free_trial',{p_slug:slug});
 if(error||!data?.activated){
  const msg=(error?.message||'').toLocaleLowerCase('pt-BR');
  const flag=msg.includes('já utilizou')?'usado':
   msg.includes('esgotadas')?'vagas':
   msg.includes('histórico de licenças')?'licenca':
   msg.includes('e-mail')?'email':
   msg.includes('indisponível')?'indisponivel':'falha';
  redirect(back+'&erro='+flag);
 }
 revalidatePath('/minha-conta');
 revalidatePath('/download');
 revalidatePath('/dispositivos');
 redirect('/minha-conta?teste=ativado');
}
