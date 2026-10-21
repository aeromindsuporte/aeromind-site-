// Textos padrão compartilhados entre painel e vitrine. O administrador
// pode substituir cada um salvando os campos marketing_* do catálogo.
export type PlanDisplay={
 slug:string;tier:string;duration_days:number;trial_quantity?:number|null;
 marketing_title?:string|null;marketing_description?:string|null;
 marketing_duration_caption?:string|null;marketing_unpriced_label?:string|null;
 marketing_features?:string[]|null;
};
export function durationOf(plan:PlanDisplay):string{
 if(plan.slug==='teste-horas'){
  const n=plan.trial_quantity||1;
  return n+' '+(n===1?'hora':'horas');
 }
 if(plan.slug==='teste-dias'){
  const n=plan.trial_quantity||1;
  return n+' '+(n===1?'dia':'dias');
 }
 return plan.duration_days+' '+(plan.duration_days===1?'dia':'dias');
}
export function titleOf(plan:PlanDisplay):string{
 if(plan.marketing_title?.trim())return plan.marketing_title.trim();
 if(plan.slug==='teste-horas')return 'Teste por horas';
 if(plan.slug==='teste-dias')return 'Teste por dias';
 const names:Record<number,string>={30:'Mensal',90:'Trimestral',180:'Semestral',365:'Anual'};
 return plan.tier+' '+(names[plan.duration_days]||'');
}
export function descriptionOf(plan:PlanDisplay):string{
 if(plan.marketing_description?.trim())return plan.marketing_description.trim();
 if(plan.slug==='teste-horas')return 'Experimente os recursos Básico pelo período escolhido';
 if(plan.slug==='teste-dias')return 'Experimente os recursos Básico por alguns dias';
 if(plan.tier==='Pro')return 'Experiência ampliada';
 if(plan.tier==='Ultra')return 'Recursos avançados';
 return 'Monitoramento essencial';
}
export function durationLabelOf(plan:PlanDisplay):string{
 return plan.marketing_duration_caption?.trim()||'por '+durationOf(plan);
}
export function noPriceLabelOf(plan:PlanDisplay):string{
 return plan.marketing_unpriced_label?.trim()||'Sem preço';
}
export function benefitsOf(plan:PlanDisplay):string[]{
 if(plan.marketing_features?.length)return plan.marketing_features;
 if(plan.slug.startsWith('teste-'))return ['Monitoramento Básico','Histórico do aplicativo','Acesso por tempo definido'];
 if(plan.tier==='Pro')return ['Módulos adicionais','Histórico completo','Previsão Rosa V4','Alertas do monitor'];
 if(plan.tier==='Ultra')return ['Ranking e estatísticas','Análises históricas','Ferramentas do monitor'];
 return ['Interface e monitor B4','Histórico do aplicativo','Alertas básicos'];
}
