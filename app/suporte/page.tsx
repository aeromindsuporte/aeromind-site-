import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {SupportChatPanel} from '@/components/support/SupportChat';
export const dynamic='force-dynamic';
export const metadata={title:'Chat de atendimento | AeroMind',robots:{index:false,follow:false}};
export default async function Support({searchParams}:{searchParams:Promise<{categoria?:string;assunto?:string}>}){
 const params=await searchParams;
 const initialSubject=(params.assunto?.trim().slice(0,140)|| (params.categoria==='dispositivo'?'Suporte para troca de dispositivo':'Atendimento AeroMind'));
 const sb=await createClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/entrar?next=%2Fsuporte');
 return <main className="sc-page"><div className="sc-page-inner">
  <Link href="/minha-conta">← Voltar para minha conta</Link>
  <h1>✦ Chat com o suporte AeroMind</h1>
  <p>Converse com nossa equipe e acompanhe as respostas no mesmo histórico, inclusive pelo botão flutuante do site.</p>
  <div className="sc-page-card"><SupportChatPanel initialSubject={initialSubject}/></div>
 </div></main>;
}
