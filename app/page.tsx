import {getVisiblePlans,formattedPrice} from '@/lib/catalog';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const dynamic='force-dynamic';
const html=(raw:string)=>raw.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]||x));
const fallback={
 Básico:{css:'am-plan-blue',symbol:'♙',description:'Monitoramento essencial',benefits:['Interface e monitor B4','Histórico do aplicativo','Alertas básicos']},
 Pro:{css:'am-plan-purple',symbol:'◈',description:'Experiência ampliada',benefits:['Módulos adicionais','Histórico completo','Previsão Rosa V4','Alertas do monitor']},
 Ultra:{css:'am-plan-gold',symbol:'♜',description:'Recursos avançados',benefits:['Ranking e estatísticas','Análises históricas','Ferramentas do monitor']}
} as const;
export default async function Home(){
 let content=await readFile(path.join(process.cwd(),'app','landing.html'),'utf8');
 const plans=await getVisiblePlans();
 for(const tier of ['Básico','Pro','Ultra'] as const){
  const fallbackCard=fallback[tier];
  const p=plans.find(x=>x.tier===tier&&x.duration_days===30);
  const title=html(p?.marketing_title||tier),desc=html(p?.marketing_description||fallbackCard.description);
  const price=p?html(formattedPrice(p.price_cents)):'Em definição';
  const features=(p?.marketing_features?.length?p.marketing_features:[...fallbackCard.benefits]).slice(0,8);
  const badge=p?.marketing_badge?'<span class="am-top-label">'+html(p.marketing_badge)+'</span>':p?.marketing_highlight?'<span class="am-top-label">EM DESTAQUE</span>':'';
  const label=p?.marketing_cta||'Ver planos';
  const destination=p?'/checkout?plano='+encodeURIComponent(p.slug):'/planos';
  const replacement='<article class="am-plan '+fallbackCard.css+'">'+badge+'<span class="am-plan-icon">'+fallbackCard.symbol+'</span><h3>'+title+'</h3><strong>'+price+'</strong>'+(p?'<small>por 30 dias</small>':'')+'<p>'+desc+'</p><ul>'+features.map(f=>'<li>✓ '+html(f)+'</li>').join('')+'</ul><a href="'+destination+'" class="am-btn '+(p?.marketing_highlight?'am-fill':'am-outline')+'">'+html(label)+' →</a></article>';
  const reg=new RegExp('<article class="am-plan '+fallbackCard.css+'">[\\s\\S]*?<\\/article>');
  content=content.replace(reg,replacement);
 }
 content=content.replace('Preços podem ser exibidos após configuração pelo administrador. Contratação, pagamentos e ativação de licenças continuam indisponíveis.','As licenças dependem de confirmação no servidor. O pagamento Pix está em homologação; nenhuma compra pode ser concluída enquanto isso.');
 content=content.replace('Ainda não. Contas gratuitas já podem ser criadas para testes. Pagamentos, ativação de licenças e download ainda não estão disponíveis.','Cadastros e acesso com licença estão disponíveis. O pagamento Pix encontra-se em homologação; entre em contato com o suporte para dúvidas.');
 return <><link rel="stylesheet" href="/design-v2.css"/><div dangerouslySetInnerHTML={{__html:content}}/></>;
}
