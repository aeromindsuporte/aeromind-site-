import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getPaggpayPix,readPaggpayPix,paymentConfirmed,type VerifiedPix} from './provider';

export type StoredPixOrder={
 id:string;reference_id:string;user_id:string;status:string;amount_cents:number;
 provider_transaction_id:string|null;pix_requested_at:string|null;
 pix_code:string|null;pix_expires_at:string|null;last_checked_at:string|null;
 last_payment_error:string|null;is_homologation:boolean;
};
export const orderFields='id,reference_id,user_id,status,amount_cents,provider_transaction_id,pix_requested_at,pix_code,pix_expires_at,last_checked_at,last_payment_error,is_homologation';
export async function reconcileWithPaggpay(
 admin:SupabaseClient,order:StoredPixOrder,transactionId:string,eventId?:string,
):Promise<VerifiedPix>{
 const remote=await getPaggpayPix(transactionId,order.is_homologation?'live-test':'sandbox');
 const verified=readPaggpayPix(remote,{referenceId:order.reference_id,amountCents:order.amount_cents,
  transactionId:order.provider_transaction_id||transactionId});
 if(paymentConfirmed(verified)){
  const id=eventId||('poll-'+createHash('sha256').update(order.reference_id).digest('hex'));
  const {data,error}=await admin.rpc('aeromind_fulfill_pix',{
   p_event_id:id,p_reference_id:order.reference_id,p_amount_cents:order.amount_cents,
   p_provider_transaction_id:verified.transactionId,
  });
  if(error||data!==true)throw new Error('A confirmação da licença foi recusada pelo banco');
 }else if(order.status!=='paid' && ['created','pending'].includes(order.status)){
  const update={
   provider_transaction_id:verified.transactionId,status:'pending',
   pix_code:verified.code, pix_expires_at:verified.expiresAt,last_checked_at:new Date().toISOString(),
   last_payment_error:null,
  };
  const {error}=await admin.from('aeromind_payment_orders').update(update).eq('id',order.id)
   .in('status',['created','pending'])
   .or('provider_transaction_id.is.null,provider_transaction_id.eq.'+verified.transactionId);
  if(error)throw new Error('Falha ao salvar conciliação de Pix');
 }
 return verified;
}
