import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {MAX_PIX_WEBHOOK_BYTES,verifyPaggpaySignature,parsePaggpayEvent} from '../lib/pix/webhook.ts';

const SECRET='whsec_local_fixture_not_a_credential';
const NOW=1_792_430_000;
const ref='aeromind-11111111-1111-4111-8111-111111111111';
const event={id:'evt_test_12345678',event:'pix.cashin.succeeded',data:{reference_id:ref,id:'txn_sandbox_test',value:3490}};
const raw=JSON.stringify(event);
const signed=(body,ts=NOW,secret=SECRET)=>'t='+ts+',v1='+createHmac('sha256',secret).update(ts+'.'+body).digest('hex');

test('assinatura correta do corpo bruto passa na tolerância',()=>assert.equal(verifyPaggpaySignature(raw,signed(raw),SECRET,NOW),true));
test('assinatura ausente ou chave incorreta é recusada',()=>{
 assert.equal(verifyPaggpaySignature(raw,null,SECRET,NOW),false);
 assert.equal(verifyPaggpaySignature(raw,signed(raw,NOW,'chave_errada'),SECRET,NOW),false);
});
test('alterar um único byte do corpo invalida a assinatura',()=>assert.equal(verifyPaggpaySignature(raw+' ',signed(raw),SECRET,NOW),false));
test('timestamp vencido ou futuro além de cinco minutos é recusado',()=>{
 assert.equal(verifyPaggpaySignature(raw,signed(raw,NOW-301),SECRET,NOW),false);
 assert.equal(verifyPaggpaySignature(raw,signed(raw,NOW+301),SECRET,NOW),false);
 assert.equal(verifyPaggpaySignature(raw,signed(raw,NOW-300),SECRET,NOW),true);
});
test('assinatura malformada ou corpo excessivo é recusado',()=>{
 assert.equal(verifyPaggpaySignature(raw,'t=0,v1=aaa',SECRET,NOW),false);
 assert.equal(verifyPaggpaySignature('x'.repeat(MAX_PIX_WEBHOOK_BYTES+1),signed('x'.repeat(MAX_PIX_WEBHOOK_BYTES+1)),SECRET,NOW),false);
});
test('evento de sucesso válido retorna identificadores e centavos',()=>{
 assert.deepEqual(parsePaggpayEvent(raw),{kind:'success',eventId:event.id,referenceId:ref,transactionId:'txn_sandbox_test',amountCents:3490});
});
test('eventos sem confirmação de pagamento são ignorados',()=>{
 assert.deepEqual(parsePaggpayEvent(JSON.stringify({...event,event:'transaction.failed'})),{kind:'ignored'});
});
test('pagamento falso, decimal, booleano, inexistente e referência errada são rejeitados',()=>{
 for(const value of [true,null,0,-1,12.25,'1.50',Number.MAX_SAFE_INTEGER+2]){
  assert.deepEqual(parsePaggpayEvent(JSON.stringify({...event,data:{...event.data,value}})),{kind:'invalid'});
 }
 assert.deepEqual(parsePaggpayEvent(JSON.stringify({...event,data:{...event.data,reference_id:'outro-123'}})),{kind:'invalid'});
});
test('JSON inválido e IDs ausentes não passam',()=>{
 assert.deepEqual(parsePaggpayEvent('{'),{kind:'invalid'});
 assert.deepEqual(parsePaggpayEvent(JSON.stringify({...event,id:'a'})),{kind:'invalid'});
});
