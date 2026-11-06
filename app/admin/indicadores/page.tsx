import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';

export const dynamic='force-dynamic';
export const metadata={title:'Indicadores · Auditoria ADM | AeroMind',robots:{index:false,follow:false}};

type DailyRow={
  observed_day:string;model_version:string;
  received:number;valid_rounds:number;interrupted_rounds:number;
  baixa_hits:number;mediana_hits:number;alta_hits:number;
  risk_wins:number;risk_losses:number;risk_interruptions:number;
};
type RoundRow={
  round_at:string;actual_x:number;p25_x:number;p50_x:number;p75_x:number;
  continuous:boolean;risk_state:string;risk_attempt:number;
  risk_outcome:string|null;model_version:string;
};
const fmt=(n:unknown)=>Number(n||0).toLocaleString('pt-BR');
const x=(n:unknown)=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'x';
const pct=(a:number,b:number)=>b>0?(100*a/b).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—';
const time=(ts:string)=>new Date(ts).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});

export default async function AdminIndicatorReports(){
 const {sb,user}=await requireAdmin();
 // Row access to this dataset is restricted by Supabase RLS to its
 // registered owner UID. Being another staff admin is not sufficient.
 const [days,rounds]=await Promise.all([
   sb.from('aeromind_indicator_daily')
     .select('observed_day,model_version,received,valid_rounds,interrupted_rounds,baixa_hits,mediana_hits,alta_hits,risk_wins,risk_losses,risk_interruptions')
     .order('observed_day',{ascending:false}).limit(90),
   sb.from('aeromind_indicator_telemetry')
     .select('round_at,actual_x,p25_x,p50_x,p75_x,continuous,risk_state,risk_attempt,risk_outcome,model_version')
     .order('round_at',{ascending:false}).limit(40)
 ]);
 const error=days.error||rounds.error;
 const daily=(days.data||[]) as DailyRow[];
 const recent=(rounds.data||[]) as RoundRow[];
 const total=daily.reduce((acc,d)=>({
   received:acc.received+Number(d.received||0),
   valid:acc.valid+Number(d.valid_rounds||0),
   interrupted:acc.interrupted+Number(d.interrupted_rounds||0),
   low:acc.low+Number(d.baixa_hits||0),
   med:acc.med+Number(d.mediana_hits||0),
   high:acc.high+Number(d.alta_hits||0),
   riskWin:acc.riskWin+Number(d.risk_wins||0),
   riskLoss:acc.riskLoss+Number(d.risk_losses||0),
   riskInterrupted:acc.riskInterrupted+Number(d.risk_interruptions||0),
 }),{received:0,valid:0,interrupted:0,low:0,med:0,high:0,riskWin:0,riskLoss:0,riskInterrupted:0});
 return <CommercialAdminShell active="/admin/indicadores" title="Indicadores · Auditoria ADM"
 description="Relatórios reais dos quatro indicadores; acesso exclusivo à identidade administrativa proprietária.">
  <section className="admin-card">
    <h2>Coleta automática do aplicativo</h2>
    <p className="admin-card-explain">Esta área acompanha exclusivamente os relatórios autorizados da conta ADM, independentemente do aparelho. Não consulta apostas, saldos, cookies nem informações de clientes. O histórico detalhado é retido por até 48 horas e os resumos diários por até 90 dias.</p>
    <p className="admin-card-explain"><strong>Interpretação:</strong> P25, P50 e P75 são faixas históricas calculadas antes do resultado observado. A porcentagem de resultados que ultrapassa cada faixa mede cobertura descritiva, não a probabilidade de ganho ou uma previsão validada. Descontinuidades não entram na cobertura.</p>
    <p><Link href="/admin/relatorios" className="admin-inline-action">← Relatórios gerenciais</Link></p>
  </section>
  {error?<section className="admin-card"><p role="alert" className="admin-feedback bad">Não foi possível consultar a auditoria de indicadores. Verifique a sessão administrativa e as permissões de leitura.</p></section>:
   !daily.length?<section className="admin-card">
     <h2>Aguardando os primeiros resultados reais</h2>
     <p className="admin-card-explain">O banco ainda não recebeu relatórios suficientes para análise. Depois que a atualização com telemetria estiver instalada e a conta administradora estiver coletando rodadas confirmadas, os dados aparecerão aqui.</p>
     <p className="admin-card-explain">Conta autenticada: {user.email||'Administrador'}.</p>
   </section>:<>
    <section className="admin-stats">
      {[
       ['Rodadas recebidas',fmt(total.received)],
       ['Com continuidade verificada',fmt(total.valid)],
       ['Continuidade interrompida',fmt(total.interrupted)],
       ['BAIXA · cobertura P25',pct(total.low,total.valid)],
       ['MEDIANA · cobertura P50',pct(total.med,total.valid)],
       ['ALTA · cobertura P75',pct(total.high,total.valid)],
       ['ALTO RISCO · janelas WIN / LOSS',fmt(total.riskWin)+' / '+fmt(total.riskLoss)],
       ['ALTO RISCO · interrupções',fmt(total.riskInterrupted)]
      ].map(([label,value])=><div className="admin-stat" key={label}><div className="admin-stat-body"><span>{label}</span><strong>{value}</strong></div></div>)}
    </section>
    <section className="admin-card">
      <h2>Histórico diário dos indicadores</h2>
      <p className="admin-card-explain">Dias agrupados em UTC e separados por versão do cálculo. Não misturar períodos com versões diferentes ao comparar resultados.</p>
      <div style={{overflowX:'auto'}}>
       <table style={{width:'100%',borderCollapse:'collapse',whiteSpace:'nowrap'}}>
        <thead><tr>{['Dia (UTC)','Modelo','Válidas','Lacunas','Baixa P25','Mediana P50','Alta P75','Alto Risco W/L'].map(h=><th key={h} style={{padding:10,textAlign:'left'}}>{h}</th>)}</tr></thead>
        <tbody>{daily.map(d=><tr key={d.observed_day+'|'+d.model_version}>
          <td style={{padding:10}}>{d.observed_day}</td>
          <td style={{padding:10}}>{d.model_version}</td>
          <td style={{padding:10}}>{fmt(d.valid_rounds)}</td>
          <td style={{padding:10}}>{fmt(d.interrupted_rounds)}</td>
          <td style={{padding:10}}>{pct(d.baixa_hits,d.valid_rounds)}</td>
          <td style={{padding:10}}>{pct(d.mediana_hits,d.valid_rounds)}</td>
          <td style={{padding:10}}>{pct(d.alta_hits,d.valid_rounds)}</td>
          <td style={{padding:10}}>{fmt(d.risk_wins)} / {fmt(d.risk_losses)}</td>
        </tr>)}</tbody>
       </table>
      </div>
    </section>
    <section className="admin-card">
      <h2>Últimas 40 rodadas auditadas</h2>
      <p className="admin-card-explain">Horários no fuso de Brasília. Rodadas de histórico recuperado sem horário confirmado não são enviadas. Se a continuidade não estiver comprovada, o evento permanece marcado como inválido para estudo.</p>
      <div style={{overflowX:'auto'}}>
       <table style={{width:'100%',borderCollapse:'collapse',whiteSpace:'nowrap'}}>
        <thead><tr>{['Capturada em','Resultado','Baixa','Mediana','Alta','Continuidade','Alto Risco'].map(h=><th key={h} style={{padding:10,textAlign:'left'}}>{h}</th>)}</tr></thead>
        <tbody>{recent.map((r,i)=><tr key={r.round_at+'|'+i}>
          <td style={{padding:10}}>{time(r.round_at)}</td>
          <td style={{padding:10}}>{x(r.actual_x)}</td>
          <td style={{padding:10}}>{x(r.p25_x)}</td>
          <td style={{padding:10}}>{x(r.p50_x)}</td>
          <td style={{padding:10}}>{x(r.p75_x)}</td>
          <td style={{padding:10}}>{r.continuous?'Verificada':'Não verificada'}</td>
          <td style={{padding:10}}>{r.risk_outcome||r.risk_state||'—'}{r.risk_state==='ACTIVE'?' ('+r.risk_attempt+'/8)':''}</td>
        </tr>)}</tbody>
       </table>
      </div>
    </section>
   </>}
 </CommercialAdminShell>;
}
