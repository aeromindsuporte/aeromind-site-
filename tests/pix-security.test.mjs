import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {MAX_PIX_WEBHOOK_BYTES,verifyPaggpaySignature,parsePaggpayEvent,isAeromindReference} from '../lib/pix/webhook.ts';
import {readPaggpayPix,paymentConfirmed,isAeromindCallback} from '../lib/pix/provider.ts';

const SECRET='whsec_local_fixture_not_a_credential';
const NOW=1_792_430_000;
const reference='aeromind-11111111-1111-4111-8111-111111111111';
const transactionId='txn_sandbox_test';
const evt={id:'evt_test_12345678',event:'pix.cashin.succeeded',
 data:{reference_id:reference,id:transactionId,amount:3490,currency_code:'BRL'}};
const raw=JSON.stringify(evt);
const signed=(body,ts=NOW,secret=SECRET)=>'t='+ts+',v1='+createHmac('sha256',secret).update(ts+'.'+body).digest('hex');
const sample={transaction:{id:transactionId,reference_id:reference,status:'pending',currency_code:'BRL'},
 pix:{value:3490,code:'000201TESTE_PIX_APENAS_MOCK',qrcode:null,expiration_date:'2026-10-20T00:00:00Z'}};
const expected={referenceId:reference,amountCents:3490,transactionId};
test('assinatura HMAC correta autoriza corpo original',()=>assert.equal(verifyPaggpaySignature(raw,signed(raw),SECRET,NOW),true));
test('assinatura ausente ou chave incorreta é rejeitada',()=>{
 assert.equal(verifyPaggpaySignature(raw,null,SECRET,NOW),false);
 assert.equal(verifyPaggpaySignature(raw,signed(raw,NOW,'outro'),SECRET,NOW),false);
});
test('um byte alterado invalida assinatura',()=>assert.equal(verifyPaggpaySignature(raw+' ',signed(raw),SECRET,NOW),false));
test('janela de cinco minutos rejeita replay',()=>{
 assert.equal(verifyPaggpaySignature(raw,signed(raw,NOW-301),SECRET,NOW),false);
 assert.equal(verifyPaggpaySignature(raw,signed(raw,NOW+301),SECRET,NOW),false);
 assert.equal(verifyPaggpaySignature(raw,signed(raw,NOW-300),SECRET,NOW),true);
});
test('rejeita cabeçalho inválido e tamanho excessivo',()=>{
 assert.equal(verifyPaggpaySignature(raw,'t=0,v1=aaa',SECRET,NOW),false);
 assert.equal(verifyPaggpaySignature('x'.repeat(MAX_PIX_WEBHOOK_BYTES+1),signed('x'.repeat(MAX_PIX_WEBHOOK_BYTES+1)),SECRET,NOW),false);
});
test('webhook extrai amount da Descont Saúde',()=>{
 assert.deepEqual(parsePaggpayEvent(raw),{kind:'success',eventId:evt.id,referenceId:reference,transactionId,amountCents:3490,currency:'BRL'});
});
test('webhook aceita legado value quando amount não existe',()=>{
 const body=JSON.stringify({...evt,data:{id:transactionId,reference_id:reference,value:3490,currency_code:'BRL'}});
 assert.equal(parsePaggpayEvent(body).kind,'success');
});
test('webhook não liquida eventos sem confirmação de sucesso',()=>{
 assert.deepEqual(parsePaggpayEvent(JSON.stringify({...evt,event:'transaction.failed'})),{kind:'ignored'});
});
test('webhook rejeita moeda distinta, amounts conflitantes e valores inválidos',()=>{
 for(const data of [
 {...evt.data,currency_code:'USD'},
 {...evt.data,value:3400},
 {...evt.data,amount:0},
 {...evt.data,amount:-1},
 {...evt.data,amount:1.25},
 {...evt.data,amount:true},
 {...evt.data,reference_id:'aeromind-invalido'},
 ]){
  assert.deepEqual(parsePaggpayEvent(JSON.stringify({...evt,data})),{kind:'invalid'});
 }
});
test('rejeita JSON inválido e evento incompleto',()=>{
 assert.deepEqual(parsePaggpayEvent('{'),{kind:'invalid'});
 assert.deepEqual(parsePaggpayEvent(JSON.stringify({...evt,id:'a'})),{kind:'invalid'});
});
test('POST/Pix reconhece transaction.id e pix.code',()=>{
 const value=readPaggpayPix(sample,expected);
 assert.equal(value.transactionId,transactionId);
 assert.equal(value.code,sample.pix.code);
 assert.equal(value.amountCents,3490);
 assert.equal(paymentConfirmed(value),false);
});
test('envelope data é suportado',()=>assert.equal(readPaggpayPix({data:sample},expected).code,sample.pix.code));
test('sem pix.code mantém transação sem código disponível',()=>{
 assert.equal(readPaggpayPix({...sample,pix:{value:3490}},expected).code,null);
});
test('GET /transactions converte reais exatos em centavos',()=>{
 const record={id:transactionId,status:'succeeded',currency_code:'BRL',payment_method_type:'pix',amount:'34.90',
 pix:{reference_id:reference,code:'PIX_TESTE'}};
 const value=readPaggpayPix(record,expected);
 assert.equal(value.amountCents,3490);
 assert.equal(paymentConfirmed(value),true);
});
test('nega valor, moeda, referência e ID divergentes',()=>{
 for(const changed of [
 {...sample,pix:{...sample.pix,value:3491}},
 {...sample,transaction:{...sample.transaction,id:'txn_outro_123'}},
 {...sample,transaction:{...sample.transaction,reference_id:'aeromind-invalido'}},
 {...sample,transaction:{...sample.transaction,currency_code:'USD'}},
 ])assert.throws(()=>readPaggpayPix(changed,expected));
});
test('nega sucesso se o estado não é succeeded',()=>{
 for(const status of ['pending','failed','expired','canceled']){
  assert.equal(paymentConfirmed(readPaggpayPix({...sample,transaction:{...sample.transaction,status}},expected)),false);
 }
});
test('rejeita decimais excessivos e cartão no fallback',()=>{
 const record={id:transactionId,status:'succeeded',currency_code:'BRL',payment_method_type:'pix',amount:'34.900',
 pix:{reference_id:reference}};
 assert.throws(()=>readPaggpayPix(record,expected));
 assert.throws(()=>readPaggpayPix({...record,amount:'34.90',payment_method_type:'card'},expected));
});

test('referencias da Descont Saude nao sao cobrancas AeroMind',()=>{
 const foreign='11111111-1111-4111-8111-111111111111'; // UUID da origem
 assert.equal(isAeromindReference(foreign),false);
 assert.equal(isAeromindReference(reference),true);
 const notice={...evt,data:{...evt.data,reference_id:foreign}};
 assert.deepEqual(parsePaggpayEvent(JSON.stringify(notice)),{kind:'foreign'});
});
test('outro projeto nao consegue ativar AeroMind mesmo com o mesmo gateway',()=>{
 const notices=['descont-saude-'+reference,'dspwa-'+reference,'outro_produto', '11111111-1111-4111-8111-111111111111'];
 for(const id of notices){
  assert.deepEqual(parsePaggpayEvent(JSON.stringify({...evt,data:{...evt.data,reference_id:id}})),{kind:'foreign'});
 }
});
test('referencia semelhante a AeroMind mas UUID malformado nao e aceita',()=>{
 const invalid='aeromind-11111111-1111-1111-1111-111111111111';
 assert.equal(isAeromindReference(invalid),false);
 assert.deepEqual(parsePaggpayEvent(JSON.stringify({...evt,data:{...evt.data,reference_id:invalid}})),{kind:'invalid'});
});

test('callback de Descont Saude nunca e aceito na criacao de Pix AeroMind',()=>{
 assert.equal(isAeromindCallback('https://aeromind-site.vercel.app/api/pix/webhook'),true);
 assert.equal(isAeromindCallback('https://aeromind-site-stage123-aeromindsuporte-8479.vercel.app/api/pix/webhook'),true);
 for(const url of [
  'https://qkepsqxakrduxvsvpdcn.supabase.co/functions/v1/paggpay-webhook',
  'https://descont-saude-pedro-osorio.vercel.app/api/pix/webhook',
  'http://aeromind-site.vercel.app/api/pix/webhook',
  'https://aeromind-site.vercel.app/api/pix/webhook?redirect=other'
 ])assert.equal(isAeromindCallback(url),false);
});
