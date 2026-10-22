import test from 'node:test';
import assert from 'node:assert/strict';
import {
 isLicenseCurrentlyValid,effectiveLicenseStatus,labelForLicenseStatus,
 formatLicenseExpiryBrazil
} from '../lib/license-status.ts';
const expiry='2026-11-20T02:59:59.000Z'; // 19/11/2026, 23:59:59 (Brasília)
const ms=Date.parse(expiry);
test('22 de outubro: licença de 19 de novembro continua ativa',()=>{
 const now=Date.parse('2026-10-22T11:00:00Z');
 assert.equal(isLicenseCurrentlyValid('active',expiry,now),true);
 assert.equal(effectiveLicenseStatus('active',expiry,now),'active');
 assert.equal(labelForLicenseStatus('active',expiry,now),'Ativa');
});
test('um milissegundo antes do vencimento pode acessar',()=>{
 assert.equal(isLicenseCurrentlyValid('active',expiry,ms-1),true);
 assert.equal(effectiveLicenseStatus('active',expiry,ms-1),'active');
});
test('no milissegundo exato do vencimento fica vencida',()=>{
 assert.equal(isLicenseCurrentlyValid('active',expiry,ms),false);
 assert.equal(effectiveLicenseStatus('active',expiry,ms),'overdue');
 assert.equal(labelForLicenseStatus('active',expiry,ms),'Vencida');
});
test('após o vencimento, active persistido é interpretado como vencida',()=>{
 assert.equal(isLicenseCurrentlyValid('active',expiry,ms+86400000),false);
 assert.equal(effectiveLicenseStatus('active',expiry,ms+86400000),'overdue');
});
test('sem validade ou com data inválida não é ativa',()=>{
 for(const value of [null,'','invalid','0000-00-00']){
  assert.equal(isLicenseCurrentlyValid('active',value,ms-1),false);
  assert.equal(labelForLicenseStatus('active',value,ms-1),'Vencida');
 }
});
test('status suspensa/revogada não é liberado mesmo com vencimento futuro',()=>{
 for(const s of ['suspended','revoked','pending','expired']){
  assert.equal(isLicenseCurrentlyValid(s,expiry,ms-10000),false);
  assert.notEqual(labelForLicenseStatus(s,expiry,ms-10000),'Ativa');
 }
});
test('renovação futura volta a ficar ativa',()=>{
 assert.equal(effectiveLicenseStatus('active',new Date(ms+86400000).toISOString(),ms+1),'active');
});
test('data é desambiguada com mês por extenso e horário de Brasília',()=>{
 assert.match(formatLicenseExpiryBrazil(expiry),/19 de novembro de 2026/);
 assert.match(formatLicenseExpiryBrazil(expiry),/23:59/);
 assert.match(formatLicenseExpiryBrazil(expiry),/horário de Brasília/);
 assert.equal(formatLicenseExpiryBrazil(null),'—');
 assert.equal(formatLicenseExpiryBrazil('bad'),'—');
});
