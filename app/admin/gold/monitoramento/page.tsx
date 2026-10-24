import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {goldProspectiveReport,type GoldSignal,type GoldRound} from '@/lib/gold/prospective';
import {recordGoldRound,recordGoldSignal} from './actions';
import './monitor.css';

export const dynamic='force-dynamic';
export const metadata={title:'Gold · Monitoramento | AeroMind',robots:{index:false,follow:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fmt=(date:string|null)=>date?new Date(date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const pct=(x:number|null)=>x===null?'—':(x*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const notices:Record<string,string>={
 'round-saved':'Rodada registrada com horário do servidor e origem manual.',
 'signal-saved':'Sinal de laboratório registrado ANTES do resultado informado ao servidor.',
 invalid:'Confira todos os campos. Apenas IDs, valores e modalidades válidos são aceitos.',
 duplicate:'Este registro já existe; a duplicação foi rejeitada sem sobrescrever.',
 sequence:'A rodada anterior deve ser a última registrada e o resultado seguinte ainda não pode existir.',
 error:'O banco não confirmou a operação. Nenhum registro foi salvo.'
};
const errorMessages=['invalid','duplicate','sequence','error'];
const statusText:Record<string,string>={
 'aguardando_resultado':'Aguardando resultado',
 'limiar_atingido':'Limiar atingido',
 'limiar_nao_atingido':'Limiar não atingido',
 'ordem_inconsistente':'Inconsistente'
};

export default async function GoldMonitor({searchParams}:{searchParams:Promise<{cliente?:string;msg?:string}>}){
 const {sb,role}=await requireAdmin();
 if(role!=='admin'&&role!=='owner')redirect('/admin');
 const params=await searchParams;
 const id=params.cliente&&uuid.test(params.cliente)?params.cliente:null;
 const [customer,roundResult,signalResult,exportResult]=id?await Promise.all([
  sb.rpc('aeromind_admin_customer_v3',{p_user_id:id}),
  sb.from('aeromind_gold_round_observations').select('id,subject_id,stream_key,round_key,multiplier,source_kind,observed_at')
   .eq('subject_id',id).order('observed_at',{ascending:false}).limit(200),
  sb.from('aeromind_gold_prospective_signals').select('id,subject_id,stream_key,next_round_key,anchor_round_id,profile,indicator,target_x,rule_version,evidence_type,emitted_at')
   .eq('subject_id',id).order('emitted_at',{ascending:false}).limit(200),
  sb.from('aeromind_gold_report_exports').select('id,requested_by,rows_exported,exported_at')
   .eq('subject_id',id).order('exported_at',{ascending:false}).limit(8)
 ]):[null,null,null,null];
 const exists=!!id&&!!customer&&!customer.error&&!!customer.data?.id;
 const error=exists&&(!!roundResult?.error||!!signalResult?.error||!!exportResult?.error);
 const rounds=(roundResult?.data||[]) as GoldRound[],signals=(signalResult?.data||[]) as GoldSignal[];
 const report=exists&&!error?goldProspectiveReport(signals,rounds):null;
 const recent=rounds[0];
 const streams=[...new Set(rounds.map(r=>r.stream_key))];
 const baseStream=recent?.stream_key||'laboratorio_01';
 const lastInStream=rounds.find(x=>x.stream_key===baseStream);
 const msg=params.msg||'';
 return <CommercialAdminShell active="/admin/gold" title="Gold · Monitoramento"
  description="Laboratório prospectivo de rodadas e relatórios segregados por cliente, sem feed ao vivo.">
  <div className="gold-monitor">
   <nav className="gold-monitor-links"><Link href="/admin/gold">← Voltar à Central Gold</Link><Link href="/admin/gold/comparador">Comparador offline →</Link></nav>
   <section className="admin-card">
    <span className="gold-monitor-tag">AMBIENTE ADMINISTRATIVO · REGISTROS MANUAIS</span>
    <h2>Monitoramento prospectivo</h2>
    <p className="admin-card-explain">O site ainda não possui uma fonte externa validada de rodadas. Esta tela registra declarações administrativas com horário recebido pelo servidor. Os dados NÃO comprovam que uma previsão foi mostrada antes da rodada real acontecer.</p>
    <p className="admin-card-explain">Uma rodada pode ser registrada sem sinal. Para aferir um limiar: registre a última rodada encerrada, registre um sinal indicando a rodada seguinte, e só depois registre o resultado da rodada seguinte. Nunca é possível atualizar registros anteriores pelo painel.</p>
   </section>
   {!id?<section className="admin-card"><h2>Escolha um cliente</h2><p>Selecione primeiro um cliente na Central Gold para manter históricos separados por conta.</p><Link className="admin-inline-action" href="/admin/gold#gold-clientes">Localizar cliente →</Link></section>:
    !exists?<section className="admin-card"><p role="alert" className="admin-feedback bad">Cliente não encontrado ou inacessível.</p><Link href="/admin/gold#gold-clientes">Selecionar outro cliente →</Link></section>:
    error?<section className="admin-card"><p className="admin-feedback bad" role="alert">Não foi possível consultar os registros com segurança. Formulários e exportação foram bloqueados.</p></section>:
    <>
     <section className="admin-card">
      <h2>Cliente: {customer!.data.display_name||'AeroMind'}</h2>
      <p className="gold-monitor-email">{customer!.data.email}</p>
      <p className="gold-monitor-note">Escopo de auditoria: somente esta conta. Não interfere em seu plano, sua autorização Gold ou sua licença existente.</p>
      {msg&&<p role={errorMessages.includes(msg)?'alert':'status'} className={'admin-feedback '+(errorMessages.includes(msg)?'bad':'good')}>{notices[msg]||notices.error}</p>}
      <div className="gold-monitor-counters">
       <div><strong>{report!.roundCount}</strong><span>Rodadas consultadas</span></div>
       <div><strong>{report!.signalCount}</strong><span>Sinais declarados</span></div>
       <div><strong>{report!.summaries.reduce((a,x)=>a+x.resolved,0)}</strong><span>Resultados associados</span></div>
       <div><strong>{report!.gapsOver300}</strong><span>Intervalos de recepção acima de 300s</span></div>
      </div>
      <p className="gold-monitor-note">Até 200 registros recentes de cada tipo. Horário da última observação: {fmt(report!.latestObserved)}. Os intervalos se referem ao RECEBIMENTO manual, não à continuidade comprovada do jogo.</p>
     </section>
     <div className="gold-monitor-forms">
      <section className="admin-card">
       <h2>1 · Registrar rodada encerrada</h2>
       <form action={recordGoldRound} className="gold-monitor-form">
        <input type="hidden" name="cliente" value={id}/>
        <label>Identificador do fluxo<input name="stream" defaultValue={baseStream} required maxLength={48} pattern="[A-Za-z0-9_-]{3,48}"/></label>
        <label>ID da rodada<input name="round" placeholder="Ex.: rodada_101" required maxLength={80}/></label>
        <label>Multiplicador observado<input name="multiplier" placeholder="Ex.: 2,35" inputMode="decimal" required/></label>
        <button type="submit">Registrar resultado manual</button>
       </form>
      </section>
      <section className="admin-card">
       <h2>2 · Registrar sinal antes do resultado</h2>
       <form action={recordGoldSignal} className="gold-monitor-form">
        <input type="hidden" name="cliente" value={id}/>
        <label>Fluxo<input name="stream" defaultValue={baseStream} required maxLength={48} pattern="[A-Za-z0-9_-]{3,48}"/></label>
        <label>Última rodada encerrada<input name="anchor_round" defaultValue={lastInStream?.round_key||''} placeholder="Ex.: rodada_101" required/></label>
        <label>Próxima rodada (ainda sem resultado)<input name="next_round" placeholder="Ex.: rodada_102" required/></label>
        <label>Perfil<select name="profile" defaultValue="Gold"><option>Gold</option><option>Refinado</option><option>Clássico</option></select></label>
        <label>Indicador<select name="indicator" defaultValue="BAIXA"><option>BAIXA</option><option>MEDIANA</option><option>ALTA</option></select></label>
        <label>Alvo declarado (x)<input name="target" inputMode="decimal" placeholder="Ex.: 1,80" required/></label>
        <p className="gold-monitor-note">Clássico permanece apenas referência: filtro legado ainda não auditado. Alvos digitados são declarações, não cálculos certificados pelo motor.</p>
        <button type="submit">Registrar sinal prospectivo</button>
       </form>
      </section>
     </div>
     <section className="admin-card">
      <div className="gold-monitor-section-head"><div><h2>Relatórios por indicador</h2><p className="gold-monitor-note">Métrica: frequência em que o resultado cadastrado atingiu o alvo declarado, não lucro ou acerto financeiro.</p></div>
       <a className="gold-monitor-export" href={'/api/admin/gold/export?cliente='+encodeURIComponent(id)}>Exportar CSV auditado ↗</a>
      </div>
      <div className="admin-table-scroll"><table><thead><tr><th>Perfil</th><th>Indicador</th><th>Registrados</th><th>Associados</th><th>Alvos atingidos</th><th>Não atingidos</th><th>Pendentes</th><th>Taxa observada</th></tr></thead>
       <tbody>{report!.summaries.map(x=><tr key={x.profile+x.indicator}>
        <td>{x.profile}</td><td>{x.indicator}</td><td>{x.total}</td><td>{x.resolved}</td><td>{x.hit}</td><td>{x.miss}</td><td>{x.pending}</td><td>{x.profile==='Clássico'?'Referência':pct(x.hitRate)}</td>
       </tr>)}</tbody></table></div>
      <p className="gold-monitor-note">Clássico é referência de limiar, sem taxa publicada até validação das regras originais. Dados importados offline não entram nesta tabela.</p>
     </section>
     <section className="admin-card">
      <h2>Últimos sinais prospectivos</h2>
      <div className="admin-table-scroll"><table><thead><tr><th>Data do sinal</th><th>Fluxo</th><th>Próxima rodada</th><th>Perfil</th><th>Indicador</th><th>Alvo</th><th>Situação</th><th>Resultado</th></tr></thead><tbody>
       {report!.signals.slice(0,40).map(x=><tr key={x.id}><td>{fmt(x.emitted_at)}</td><td>{x.stream_key}</td><td>{x.next_round_key}</td><td>{x.profile}</td><td>{x.indicator}</td>
        <td>{Number(x.target_x).toLocaleString('pt-BR',{maximumFractionDigits:4})}x</td><td>{statusText[x.state]}</td><td>{x.observed_x===null?'—':x.observed_x+'x'}</td></tr>)}
       {report!.signals.length===0&&<tr><td colSpan={8}>Nenhum sinal registrado para este cliente.</td></tr>}
      </tbody></table></div>
     </section>
     <section className="admin-card">
      <h2>Últimas rodadas observadas</h2>
      <p className="gold-monitor-note">Fluxos conhecidos: {streams.length?streams.join(', '):'Nenhum'}. Não existe coleta automática nesta fase.</p>
      <div className="admin-table-scroll"><table><thead><tr><th>Recebimento</th><th>Fluxo</th><th>Rodada</th><th>Resultado</th><th>Origem</th></tr></thead><tbody>
       {rounds.slice(0,30).map(x=><tr key={x.id}><td>{fmt(x.observed_at)}</td><td>{x.stream_key}</td><td>{x.round_key}</td><td>{Number(x.multiplier)}x</td><td>Admin manual</td></tr>)}
       {rounds.length===0&&<tr><td colSpan={5}>Nenhuma rodada registrada.</td></tr>}
      </tbody></table></div>
     </section>
     <section className="admin-card">
      <h2>Auditoria de exportações</h2>
      <div className="admin-table-scroll"><table><thead><tr><th>Data</th><th>Linhas</th><th>Responsável</th></tr></thead><tbody>
       {(exportResult?.data||[]).map((e:{id:number;exported_at:string;rows_exported:number;requested_by:string|null})=><tr key={e.id}><td>{fmt(e.exported_at)}</td><td>{e.rows_exported}</td><td>{e.requested_by?'Administrador registrado':'Conta desativada'}</td></tr>)}
       {(!exportResult?.data||exportResult.data.length===0)&&<tr><td colSpan={3}>Nenhuma exportação registrada.</td></tr>}
      </tbody></table></div>
     </section>
    </>}
  </div>
 </CommercialAdminShell>;
}
