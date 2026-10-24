/**
 * Contrato de integração FUTURA de provedor autorizado — SEM endpoint ativo.
 * Somente valida assinatura e normaliza mensagens. Não há ingestão no banco.
 * A deduplicação durável por eventId deve ser implementada antes de ligar um provedor.
 */
import {createHmac,timingSafeEqual} from 'node:crypto';
export const GOLD_SOURCE_CONTRACT_VERSION='gold-authorized-source-v1';
export type AuthorizedRoundEnvelope={
 provider:string;eventId:string;sessionId:string;stream:string;
 roundId:string;occurredAt:string;multiplier:number;version:'v1'
};
const validKey=(x:unknown,len:number)=>typeof x==='string'&&x.length>0&&x.length<=len&&/^[a-zA-Z0-9_.:-]+$/.test(x);
const validStream=(x:unknown)=>typeof x==='string'&&/^[a-zA-Z0-9_-]{3,48}$/.test(x);
const dateIso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
export function normalizeAuthorizedRound(input:unknown,expectedProvider:string):AuthorizedRoundEnvelope{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Evento inválido');
 const o=input as Record<string,unknown>;
 const allowed=['eventId','multiplier','occurredAt','provider','roundId','sessionId','stream','version'];
 if(Object.keys(o).sort().join(',')!==allowed.sort().join(','))throw Error('Formato do evento não reconhecido');
 if(o.provider!==expectedProvider||!validKey(o.provider,48)||!validKey(o.eventId,80)||
  !validKey(o.sessionId,80)||!validKey(o.roundId,80)||!validStream(o.stream)||
  o.version!=='v1'||typeof o.occurredAt!=='string'||!dateIso.test(o.occurredAt)||
  !Number.isFinite(Date.parse(o.occurredAt))||typeof o.multiplier!=='number'||
  !Number.isFinite(o.multiplier)||o.multiplier<1||o.multiplier>1000000)
  throw Error('Evento fora do contrato autorizado');
 return o as unknown as AuthorizedRoundEnvelope;
}
/** Assinatura HMAC sobre timestamp e corpo original. */
export function verifyAuthorizedSourceSignature(
 raw:string,secret:string,timestampMs:string,signature:string,nowMs:number=Date.now()
):boolean{
 if(typeof raw!=='string'||raw.length>8192||typeof secret!=='string'||secret.length<32
  ||!/^[0-9]{13}$/.test(timestampMs)||!/^sha256=[a-f0-9]{64}$/.test(signature)
  ||!Number.isSafeInteger(nowMs))return false;
 const ts=Number(timestampMs);
 if(Math.abs(nowMs-ts)>120000)return false;
 const digest=createHmac('sha256',secret).update(timestampMs+'.'+raw).digest();
 const supplied=Buffer.from(signature.slice(7),'hex');
 return supplied.length===digest.length&&timingSafeEqual(supplied,digest);
}
export function authorizedSourceCanIngest(gate:{
 ingestionEnabled:boolean;deliveryEnabled:boolean;state:string;provider:string|null;verifiedAt:string|null
}):boolean{
 return gate.ingestionEnabled===true&&gate.state==='verified'&&
  !!gate.provider&&!!gate.verifiedAt;
}
