import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {FeedbackForm,type FeedbackItem} from '@/components/feedback/FeedbackForm';
import './feedback.css';
export const dynamic='force-dynamic';
export const metadata={title:'Sugestões e feedback | AeroMind',robots:{index:false,follow:false}};
export default async function FeedbackPage(){
 const sb=await createClient();
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(authError||!user)redirect('/entrar?next=%2Ffeedback');
 const {data,error}=await sb.from('aeromind_feedback')
   .select('id,user_id,category,title,message,rating,status,admin_reply,admin_reply_at,reply_read_at,created_at,updated_at')
   .eq('user_id',user.id).order('created_at',{ascending:false}).limit(80);
 return <main className="account-root fb-page">
   <header className="account-header">
    <Link href="/minha-conta" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="40" height="40"/> AeroMind</Link>
    <Link className="auth-secondary" href="/minha-conta">← Minha conta</Link>
   </header>
   <div className="account-container">
    <nav className="fb-breadcrumb" aria-label="Localização"><Link href="/minha-conta">Minha conta</Link><span>›</span><strong>Sugestões e feedback</strong></nav>
    {error?<section className="fb-alert bad" role="alert">Não foi possível carregar seu histórico. Atualize a página ou fale com o <Link href="/suporte">suporte</Link>.</section>:null}
    <FeedbackForm initial={(data||[]) as FeedbackItem[]} userId={user.id}/>
   </div>
 </main>;
}
