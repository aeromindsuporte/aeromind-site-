import {getVisiblePlans,formattedPrice} from '@/lib/catalog';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const dynamic='force-dynamic';
const esc=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const cards=[
 {tier:'Básico' as const,style:'blue',icon:'♙',description:'Monitoramento essencial',features:['Histórico do aplicativo','Alertas básicos']},
 {tier:'Pro' as const,style:'purple',icon:'◈',description:'Experiência ampliada',features:['Previsão Rosa V4','Alertas do monitor']},
 {tier:'Ultra' as const,style:'gold',icon:'♜',description:'Recursos avançados',features:['Ranking e estatísticas','Acesso aos recursos do plano']}
];
export default async function Home(){
 let content=await readFile(path.join(process.cwd(),'app','landing.html'),'utf8');
 const plans=await getVisiblePlans();
 for(const card of cards){
  const p=plans.find(x=>x.tier===card.tier&&x.duration_days===30);
  const badge=p?.marketing_badge||(p?.marketing_highlight?'EM DESTAQUE':card.tier==='Pro'?'PLANO PRO':'');
  const title=esc(p?.marketing_title||card.tier);
  const description=esc(p?.marketing_description||card.description);
  const features=(p?.marketing_features?.length?p.marketing_features:card.features).map(x=>'<li>✓ '+esc(x)+'</li>').join('');
  const href=p?'/checkout?plano='+encodeURIComponent(p.slug):'/cadastro';
  const price=p?formattedPrice(p.price_cents):'Em definição';
  const button=esc(p?.marketing_cta||'Conhecer plano')+' →';
  const replacement='<article class="am-plan am-plan-'+card.style+'">'+
   (badge?'<span class="am-top-label">'+esc(badge)+'</span>':'')+
   '<span class="am-plan-icon">'+card.icon+'</span><h3>'+title+'</h3><strong>'+esc(price)+'</strong>'+
   '<small>'+(p?'por 30 dias':'Preço não publicado')+'</small><p>'+description+'</p><ul>'+features+'</ul>'+
   '<a href="'+href+'" class="am-btn '+(p?.marketing_highlight?'am-fill':'am-outline')+'">'+button+'</a></article>';
  const original=new RegExp('<article class="am-plan am-plan-'+card.style+'">[\\s\\S]*?<\\/article>');
  content=content.replace(original,replacement);
 }
 content=content.replace('Preços podem ser exibidos após configuração pelo administrador. Contratação, pagamentos e ativação de licenças continuam indisponíveis.',
 'Preços e benefícios são configurados no painel administrativo. O pagamento Pix encontra-se em homologação e será liberado após validação.');
 content=content.replace('Ainda não. Contas gratuitas já podem ser criadas para testes. Pagamentos, ativação de licenças e download ainda não estão disponíveis.',
 'O catálogo já está disponível. O checkout Pix permanece em homologação; os downloads exigem licença ativa.');
 content=content.replace('href="mailto:aeromindsuporte@gmail.com">Suporte','href="/suporte">Suporte');
 return <><link rel="stylesheet" href="/design-v2.css"/><div dangerouslySetInnerHTML={{__html:content}}/></>;
}
