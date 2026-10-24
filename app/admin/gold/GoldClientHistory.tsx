import {validateGoldSettings,type Indicator,type Settings} from '@/lib/gold/indicators';

export type GoldConfigVersion = {
 id:number;version:number;settings:unknown;reason:string;created_at:string
};
export type GoldAuditEvent = {
 id:number;action:string;old_value:unknown;new_value:unknown;reason:string;created_at:string
};
const dateBR=(value:string)=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
const targetName:Record<string,string>={
 low35:'P25 · últimas 35 rodadas',
 column7_5_p25:'P25 · coluna 7 / 5',
 column7_5_p50:'P50 · coluna 7 / 5',
 column7_5_p75:'P75 · coluna 7 / 5',
 column7_6_p75:'P75 · coluna 7 / 6',
 column7_7_p75:'P75 · coluna 7 / 7'
};
const eventName:Record<string,string>={
 access_granted:'Autorização concedida',
 access_revoked:'Autorização revogada',
 config_saved:'Configuração versionada'
};
function filterName(filter:Settings[Indicator]['filter']){
 if(filter.mode==='continuous')return 'Monitoramento contínuo';
 if(filter.mode==='purple_count')return 'Roxos: pelo menos '+filter.k;
 if(filter.mode==='purple_improving')return 'Roxos em evolução: '+filter.k;
 return 'Pagantes: '+filter.a+' em 13 / '+filter.b+' em 5';
}
export function GoldClientHistory({versions,events,loadError=false}:{
 versions:GoldConfigVersion[];events:GoldAuditEvent[];loadError?:boolean
}){
 return <section className="admin-card gold-client-history" id="gold-historico">
  <h2>Histórico individual do Gold</h2>
  <p className="admin-card-explain">Versões registradas e alterações deste cliente, somente leitura. A versão mais recente é usada na preparação do Gold.</p>
  {loadError&&<p className="admin-feedback bad" role="alert">Não foi possível carregar todo o histórico. Não utilize as informações parciais para decidir uma alteração.</p>}
  <h3>Versões das configurações <small>({versions.length} exibidas)</small></h3>
  <div className="gold-version-list">
   {versions.map(v=><details className="gold-version" key={v.id}>
    <summary><strong>Versão {v.version}</strong><span>{dateBR(v.created_at)}</span><span>{v.reason}</span></summary>
    {validateGoldSettings(v.settings)?<ul>
     {(['BAIXA','MEDIANA','ALTA'] as Indicator[]).map(k=><li key={k}>
      <b>{k}</b> — {targetName[v.settings[k].target]} · {filterName(v.settings[k].filter)}
     </li>)}
    </ul>:<p className="gold-hint">Os parâmetros desta versão não correspondem ao catálogo vigente. Registro preservado.</p>}
   </details>)}
   {versions.length===0&&<p className="gold-hint">Nenhuma configuração personalizada registrada. O perfil Refinado é o padrão.</p>}
  </div>
  <h3>Auditoria do cliente <small>({events.length} eventos exibidos)</small></h3>
  <div className="admin-table-scroll"><table><thead><tr><th>Data</th><th>Ação</th><th>Justificativa</th></tr></thead>
   <tbody>{events.map(e=><tr key={e.id}><td>{dateBR(e.created_at)}</td><td>{eventName[e.action]||'Operação registrada'}</td><td>{e.reason}</td></tr>)}
   {events.length===0&&<tr><td colSpan={3}>Ainda não existem eventos deste cliente.</td></tr>}</tbody>
  </table></div>
  <p className="gold-hint">São exibidas até 50 versões e 50 eventos recentes. Nenhum registro histórico pode ser apagado nesta tela.</p>
 </section>;
}
