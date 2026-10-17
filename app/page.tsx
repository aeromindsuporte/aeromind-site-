import {getVisiblePlans,formattedPrice} from '@/lib/catalog';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
// O HTML aprovado é estático; nenhuma entrada de usuário é interpolada nele.
export const dynamic='force-dynamic';
export default async function Home() {
 let content = await readFile(path.join(process.cwd(), 'app', 'landing.html'),'utf8');
 const plans=await getVisiblePlans();
 for(const tier of ['Básico','Pro','Ultra'] as const){
   const configured=plans.find(p=>p.tier===tier && p.duration_days===30);
   if(configured) {
     const anchor='<h3>'+tier+'</h3><strong>Em breve</strong>';
     const value='<h3>'+tier+'</h3><strong>'+formattedPrice(configured.price_cents)+'</strong><small>por 30 dias · contratação indisponível</small>';
     content=content.replace(anchor,value);
   }
 }
 return <><link rel="stylesheet" href="/design-v2.css"/><div dangerouslySetInnerHTML={{__html:content}}/></>;
}
