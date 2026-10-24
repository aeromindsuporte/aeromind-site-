'use client';

import {useState} from 'react';
import {
 parseGoldRoundsCsv,compareGoldOffline,goldComparisonCsv,
 type ComparisonResult,type ComparedDecision
} from '@/lib/gold/comparator';
import {type Settings} from '@/lib/gold/indicators';

const stateLabel:Record<ComparedDecision['state'],string>={
 regra_legada_nao_auditada:'Clássico — filtro não auditado',
 liberado:'Condição atendida',
 aguardando_condicao:'Aguardando condição',
 historico_incompleto:'Histórico insuficiente',
 descartado_gap:'Descartado por interrupção'
};
const percent=(v:number|null)=>v===null?'—':(100*v).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const numberX=(v:number|null)=>v===null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'x';

export function GoldComparisonWorkbench({settings,configLabel}:{settings:Settings;configLabel:string}){
 const [csv,setCsv]=useState('');
 const [sessionConfirmed,setSessionConfirmed]=useState(false);
 const [result,setResult]=useState<ComparisonResult|null>(null);
 const [error,setError]=useState('');
 const [showDetails,setShowDetails]=useState(false);
 function analyze(){
  setError('');setResult(null);
  try{
   const rows=parseGoldRoundsCsv(csv);
   setResult(compareGoldOffline(rows,settings,sessionConfirmed));
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível validar os dados importados.');}
 }
 async function loadFile(file:File|undefined){
  setError('');setResult(null);
  if(!file)return;
  if(file.size>130000){setError('O arquivo ultrapassa 130 KB.');return;}
  try{setSessionConfirmed(false);setCsv(await file.text());}catch{setError('Falha ao ler arquivo local.');}
 }
 function exportCsv(){
  if(!result)return;
  const blob=new Blob([goldComparisonCsv(result)],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='aeromind_gold_comparacao_offline.csv';
  document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
 }
 return <div className="gold-comparator">
  <section className="admin-card">
   <div className="gold-compare-eyebrow">AMBIENTE DE TESTE · NÃO OPERACIONAL</div>
   <h2>Comparador sequencial Clássico × Refinado × Gold</h2>
   <p className="admin-card-explain">Importe um histórico ordenado. Para cada rodada, as regras utilizam apenas os resultados confirmados anteriores a ela (walk-forward). A rodada seguinte serve exclusivamente para conferir se o limiar foi atingido. Não cria ordens nem executa apostas.</p>
   <p className="gold-hint"><b>Configuração Gold em uso:</b> {configLabel}. Refinado conserva seus parâmetros originais. Clássico mostra apenas o alvo de referência: a liberação do filtro legado ainda depende da auditoria do aplicativo Android.</p>
   <div className="gold-compare-inputs">
    <label>Importar CSV de resultados (.csv ou .txt)
     <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={e=>{void loadFile(e.target.files?.[0]);}}/>
    </label>
    <label>Ou cole o CSV abaixo
     <textarea value={csv} onChange={e=>{setCsv(e.target.value);setResult(null);setSessionConfirmed(false);}} rows={8} spellCheck={false}
       placeholder={'id;data_hora_iso;resultado_x\nrodada-001;2026-10-24T14:00:00-03:00;1,42\nrodada-002;2026-10-24T14:00:35-03:00;2,18'} />
    </label>
    <p className="gold-hint">Formato: id;data_hora_iso;resultado_x. Data ISO 8601 com fuso obrigatório, uma rodada confirmada por linha. Entre 2 e 1.500 rodadas, IDs distintos e horários estritamente crescentes. As duas linhas do exemplo acima são fictícias, não são sinais.</p>
    <label className="gold-session-check">
     <input type="checkbox" checked={sessionConfirmed} onChange={e=>{setSessionConfirmed(e.target.checked);setResult(null);}}/>
     <span>Confirmo que a coleta deste arquivo representa uma sessão validada, com resultados confirmados e sem rodadas omitidas. A integridade não pode ser verificada automaticamente apenas pelo CSV.</span>
    </label>
    <button type="button" className="gold-compare-btn" onClick={analyze} disabled={!csv.trim()}>Executar análise offline</button>
   </div>
   {error&&<p className="admin-feedback bad" role="alert">{error}</p>}
  </section>
  {result&&<>
   <section className="admin-card" aria-live="polite">
    <div className="gold-compare-results-head"><div>
     <span className="gold-compare-eyebrow">RELATÓRIO OFFLINE · DADOS IMPORTADOS</span>
     <h2>Comparação: {result.rounds.toLocaleString('pt-BR')} rodadas</h2>
     <p className="gold-hint">Período dos registros: {result.range.first} até {result.range.last}</p>
    </div><button type="button" onClick={exportCsv} className="gold-compare-btn secondary">Exportar decisões CSV</button></div>
    <p className="gold-compare-disclaimer">{result.disclaimer}</p>
    <div className="admin-table-scroll"><table>
     <thead><tr><th>Perfil</th><th>Indicador</th><th>Oportunidades avaliadas</th><th>Condição atendida</th><th>Limiar atingido</th><th>Taxa de limiar</th><th>Histórico incompleto</th></tr></thead>
     <tbody>{result.summary.map(s=><tr key={s.profile+s.indicator}>
      <td>{s.profile}</td><td>{s.indicator}</td><td>{s.assessed}</td>
      <td>{s.profile==='Clássico'?'Não auditado':s.released}</td>
      <td>{s.profile==='Clássico'?'—':s.thresholdReached}</td>
      <td>{s.profile==='Clássico'?'—':percent(s.hitRate)}</td>
      <td>{s.profile==='Clássico'?'—':s.incomplete}</td>
     </tr>)}</tbody></table></div>
    <p className="gold-hint">Limiar atingido = a rodada seguinte teve multiplicador maior ou igual ao alvo calculado antes dela. Não é taxa de lucro, ROI, nem garantia de sucesso futuro.</p>
   </section>
   <section className="admin-card">
    <div className="gold-compare-results-head"><h2>Rastreabilidade por rodada</h2>
     <button type="button" className="gold-compare-btn secondary" onClick={()=>setShowDetails(!showDetails)}>{showDetails?'Ocultar detalhes':'Mostrar últimas 45 decisões'}</button></div>
    {showDetails&&<div className="admin-table-scroll"><table>
     <thead><tr><th>Última encerrada</th><th>Rodada seguinte</th><th>Perfil</th><th>Indicador</th><th>Alvo prévio</th><th>Status</th><th>Resultado observado</th></tr></thead>
     <tbody>{result.decisions.slice(-45).map((d,i)=><tr key={d.lastClosedId+d.nextId+d.profile+d.indicator+i}>
      <td>{d.lastClosedId}</td><td>{d.nextId}</td><td>{d.profile}</td><td>{d.indicator}</td>
      <td>{numberX(d.target)}</td><td>{stateLabel[d.state]}</td><td>{numberX(d.observed)}</td>
     </tr>)}</tbody></table></div>}
    <p className="gold-hint">O CSV completo é gerado somente no navegador do administrador. Nenhuma importação ou exportação é gravada no banco nesta fase.</p>
   </section>
  </>}
 </div>;
}
