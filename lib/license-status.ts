// A validade real sempre depende do horário do servidor/instante UTC, não
// do texto de status persistido nem da data local exibida ao cliente.
export type LicenseStoredStatus='pending'|'active'|'expired'|'suspended'|'revoked';
export type LicenseEffectiveStatus=LicenseStoredStatus|'overdue';

export function isLicenseCurrentlyValid(
 status:string|null|undefined,
 validUntil:string|null|undefined,
 nowMs:number=Date.now()
):boolean{
 if(status!=='active'||!validUntil)return false;
 const expiry=Date.parse(validUntil);
 return Number.isFinite(expiry)&&expiry>nowMs;
}
export function effectiveLicenseStatus(
 status:string|null|undefined,
 validUntil:string|null|undefined,
 nowMs:number=Date.now()
):LicenseEffectiveStatus|null{
 if(!status)return null;
 if(status==='active'&&!isLicenseCurrentlyValid(status,validUntil,nowMs))return 'overdue';
 if(['pending','active','expired','suspended','revoked'].includes(status))
  return status as LicenseStoredStatus;
 return null;
}
export function labelForLicenseStatus(
 status:string|null|undefined,
 validUntil:string|null|undefined,
 nowMs:number=Date.now()
):string{
 const key=effectiveLicenseStatus(status,validUntil,nowMs);
 const labels:Record<LicenseEffectiveStatus,string>={
  pending:'Aguardando ativação',active:'Ativa',overdue:'Vencida',
  expired:'Expirada',suspended:'Suspensa',revoked:'Revogada'
 };
 return key?labels[key]:'Nenhuma licença';
}
export function formatLicenseExpiryBrazil(value:string|null|undefined):string{
 if(!value)return '—';
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return '—';
 const fmtDate=new Intl.DateTimeFormat('pt-BR',{
  timeZone:'America/Sao_Paulo',day:'numeric',month:'long',year:'numeric'
 }).format(date);
 const fmtTime=new Intl.DateTimeFormat('pt-BR',{
  timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false
 }).format(date);
 return fmtDate+', às '+fmtTime+' (horário de Brasília)';
}


// Valores de <input type="date"> são locais; não recorte o ISO UTC,
// pois 19/11 às 23:59 (Brasília) corresponde a 20/11 em UTC.
export function dateInputBrazil(utcValue:string|null|undefined):string{
 if(!utcValue)return '';
 const d=new Date(utcValue);
 if(!Number.isFinite(d.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-US',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(d);
 const year=parts.find(x=>x.type==='year')?.value;
 const month=parts.find(x=>x.type==='month')?.value;
 const day=parts.find(x=>x.type==='day')?.value;
 return year&&month&&day?year+'-'+month+'-'+day:'';
}
