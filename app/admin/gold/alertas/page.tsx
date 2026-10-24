import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {saveGoldPreviewAlertRule} from './actions';
import {evaluateGoldAlertPreview,type GoldPreviewRule} from '@/lib/gold/alert-preview';
import type {GoldRound,GoldSignal} from '@/lib/gold/prospective';
import './alerts.css';

export const dynamic='force-dynamic';
export const metadata={title:'Gold · Alertas em preparação | AeroMind',robots:{index:false,follow:false}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const profiles=['Refinado','Gold'] as const,indicators=['BAIXA','MEDIANA','ALTA'] as const;
const outcomes:Record<string,string>={
 lab_candidate:'Candidato de laboratório — não enviado',
 no_rule:'Sem configuração',
 preview_disabled:'Prévia desativada',
 below_minimum:'Abaixo do alvo mínimo',
 resolved:'Resultado já registrado',
 expired:'Sinal antigo',
 cooldown:'Bloqueado por intervalo',
 invalid_clock:'Horário inconsistente'
};
const fmt=(date:string)=>new Date(date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
type SourceStatus={state:string;provider:string|null;ingestionEnabled:boolean;deliveryEnabled:boolean;verifiedAt:string|null};
type AlertAudit={id:number;reason:string;created_at:string;after_value:unknown};
const stateLabel:Record<string,string>={
 not_configured:'Fonte não configurada',
 awaiting_provider:'Aguardando homologação'
};
export default async function GoldAlerts({searchParams}:{searchParams:Promise<{cliente?:string;msg?:string}>}){
 const {sb,role}=await requireAdmin();
 if(!['admin','owner'].includes(role))redirect('/admin');
 const params=await searchParams,client=params.cliente&&uuid.test(params.cliente)?params.cliente:null;
 const source=await sb.rpc('aeromind_gold_admin_source_status');
 const [customer,ruleResult,auditResult,signalsResult,roundsResult]=client?await Promise.all([
  sb.rpc('aeromind_admin_customer_v3',{p_user_id:client}),
  sb.from('aeromind_gold_alert_preview_rules').select('id,subject_id,profile,indicator,preview_enabled,min_target_x,cooldown_minutes,delivery_enabled,updated_at').eq('subject_id',client).limit(10),
  sb.from('aeromind_gold_alert_rule_audit').select('id,reason,created_at,after_value').eq('subject_id',client).order('created_at',{ascending:false}).limit(20),
  sb.from('aeromind_gold_prospective_signals').select('id,subject_id,stream_key,next_round_key,anchor_round_id,profile,indicator,target_x,rule_version,evidence_type,emitted_at').eq('subject_id',client).order('emitted_at',{ascending:false}).limit(200),
  sb.from('aeromind_gold_round_observations').select('id,subject_id,stream_key,round_key,multiplier,source_kind,observed_at').eq('subject_id',client).order('observed_at',{ascending:false}).limit(200)
 ]):[null,null,null,null,null];
 const customerValid=!!client&&!customer?.error&&!!customer?.data?.id;
 const error=!!source.error||!!(client&&customerValid&&(ruleResult?.error||auditResult?.error||signalsResult?.error||roundsResult?.error));
 const settings=(ruleResult?.data||[]) as GoldPreviewRule[];
 const report=client&&customerValid&&!error?evaluateGoldAlertPreview(settings,(signalsResult?.data||[]) as GoldSignal[],(roundsResult?.data||[]) as GoldRound[],new Date().toISOString()):null;
 const gate=source.data as SourceStatus|null;
 const message=params.msg==='saved'?'Configuração de prévia salva e auditada. Nenhum alerta foi enviado.':params.msg==='invalid'?'Revise os dados do formulário.':params.msg==='permission'?'Sua conta não pode alterar estas regras.':params.msg?'Não foi possível salvar a regra.':'';
 return <CommercialAdminShell active="/admin/gold" title="Gold · Alertas Inteligentes"
  description="Configurações de laboratório e preparação da fonte de resultados, sem disparo de notificações.">
  <div className="ga-wrap">
   <nav className="ga-links"><Link href="/admin/gold">← Central Gold</Link><Link href="/admin/gold/monitoramento">Monitoramento manual →</Link></nav>
   <section className="admin-card">
    <span className="ga-eyebrow">ETAPA 6 · AMBIENTE DE PREPARAÇÃO</span>
    <h2>Fonte de dados e segurança</h2>
    {source.error?<p className="admin-feedback bad" role="alert">A situação da fonte não pôde ser verificada. Edição e prévias estão indisponíveis.</p>:<>
     <div className="ga-source-state"><strong>{stateLabel[gate?.state||'not_configured']||'Situação indefinida'}</strong>
      <span>Ingestão externa: {gate?.ingestionEnabled?'Em revisão':'DESLIGADA'}</span>
      <span>Notificações automáticas: {gate?.deliveryEnabled?'Em revisão':'DESLIGADAS'}</span>
     </div>
     <p className="admin-card-explain">Nenhum provedor externo foi autorizado ou homologado nesta conversa. Existe um contrato técnico com validação de assinatura para integração futura, mas não há API operacional de coleta nem transmissão de avisos. A ativação exigirá validação específica e nova revisão de segurança.</p>
    </>}
   </section>
   {!client?<section className="admin-card"><h2>Selecione um cliente</h2><p className="admin-card-explain">As regras e os relatórios de prévia são individuais e exigem seleção pela Central Gold.</p><Link className="ga-link" href="/admin/gold#gold-clientes">Localizar cliente →</Link></section>:
    !customerValid?<section className="admin-card"><p className="admin-feedback bad" role="alert">Cliente não encontrado ou sem acesso administrativo.</p><Link href="/admin/gold">Selecionar outro cliente →</Link></section>:
    error?<section className="admin-card"><p className="admin-feedback bad" role="alert">Não foi possível carregar as configurações com segurança; formulários bloqueados.</p></section>:
    <>
     <section className="admin-card">
      <h2>Prévia de alertas — {customer!.data.display_name||'Cliente AeroMind'}</h2>
      <p className="ga-muted">{customer!.data.email}</p>
      {message&&<p className={'admin-feedback '+(params.msg==='saved'?'good':'bad')} role="status">{message}</p>}
      <p className="admin-card-explain">Configure separadamente BAIXA, MEDIANA e ALTA para Refinado e Gold. O interruptor habilita apenas a prévia visual administrativa, nunca mensagens aos clientes. O perfil Clássico aguarda auditoria das regras originais.</p>
      <div className="ga-summary">
       <div><b>{report!.candidateCount}</b><span>Candidatos de laboratório</span></div>
       <div><b>{report!.expiredCount}</b><span>Fora da janela de 180s</span></div>
       <div><b>{report!.cooldownCount}</b><span>Bloqueados por intervalo</span></div>
       <div><b>{report!.decisions.length}</b><span>Registros examinados</span></div>
      </div>
      <p className="ga-muted">Os candidatos são calculados a partir de sinais MANUAIS ao abrir esta página. Não são alertas ao vivo e não serão enviados ou salvos como notificações.</p>
     </section>
     <section className="admin-card">
      <h2>Configurar regras de prévia</h2>
      <div className="ga-grid">
       {profiles.flatMap(profile=>indicators.map(indicator=>{
        const current=settings.find(x=>x.profile===profile&&x.indicator===indicator);
        return <form key={profile+'-'+indicator} action={saveGoldPreviewAlertRule} className="ga-rule">
         <input name="cliente" type="hidden" value={client}/>
         <input name="profile" type="hidden" value={profile}/>
         <input name="indicator" type="hidden" value={indicator}/>
         <header><strong>{profile} · {indicator}</strong><small>{current?'Configurada':'Sem configuração'}</small></header>
         <label className="ga-check"><input type="checkbox" name="preview_enabled" defaultChecked={current?.preview_enabled||false}/><span>Mostrar candidatos em laboratório</span></label>
         <label>Alvo mínimo (x)<input name="min_target" type="number" step="0.0001" min="1" max="1000000" defaultValue={Number(current?.min_target_x||2)} required/></label>
         <label>Intervalo mínimo entre candidatos (min)<input name="cooldown" type="number" min="1" max="240" step="1" defaultValue={current?.cooldown_minutes||5} required/></label>
         <label>Justificativa da mudança<input name="reason" minLength={8} maxLength={500} required placeholder="Ex.: Ajuste solicitado na análise"/></label>
         <button type="submit">Salvar versão da regra</button>
        </form>;
       }))}
      </div>
     </section>
     <section className="admin-card">
      <h2>Prévia e rastreabilidade dos últimos sinais</h2>
      <div className="admin-table-scroll">
       <table><thead><tr><th>Momento do registro</th><th>Perfil</th><th>Indicador</th><th>Rodada</th><th>Alvo</th><th>Decisão de laboratório</th></tr></thead>
        <tbody>
         {report!.decisions.slice(0,50).map(x=><tr key={x.signalId}><td>{fmt(x.emittedAt)}</td><td>{x.profile}</td><td>{x.indicator}</td><td>{x.nextRound}</td>
          <td>{x.target.toLocaleString('pt-BR',{maximumFractionDigits:4})}x</td><td>{outcomes[x.state]}</td></tr>)}
         {report!.decisions.length===0&&<tr><td colSpan={6}>Nenhum sinal manual registrado para análise.</td></tr>}
        </tbody>
       </table>
      </div>
      <p className="ga-muted">Amostra limitada aos 200 sinais e 200 resultados mais recentes deste cliente. Dados ausentes não geram acertos presumidos. O relógio da consulta não representa o relógio de um provedor de jogo.</p>
     </section>
     <section className="admin-card">
      <h2>Histórico de alterações das regras</h2>
      <div className="admin-table-scroll"><table><thead><tr><th>Alterado em</th><th>Justificativa</th><th>Registro</th></tr></thead>
       <tbody>{((auditResult?.data||[]) as AlertAudit[]).map(x=><tr key={x.id}><td>{fmt(x.created_at)}</td><td>{x.reason}</td><td>Versão de regra registrada</td></tr>)}
        {!auditResult?.data?.length&&<tr><td colSpan={3}>Nenhuma regra foi alterada ainda.</td></tr>}</tbody></table></div>
     </section>
    </>}
  </div>
 </CommercialAdminShell>;
}
