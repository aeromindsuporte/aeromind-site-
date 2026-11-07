import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerToken, installationHash, publishedApk, betaApk } from '../lib/mobile/apk-validation.ts';

const sha = 'a'.repeat(64);
const valid = {
  id: 'release-id',
  version_code: 49,
  version_name: 'AeroMind 1.2',
  status: 'published',
  sha256: sha,
  size_bytes: 1400000,
  storage_path: 'releases/aeromind-v49-' + sha.slice(0, 16) + '.apk',
};

test('somente JWT Bearer no cabecalho; nunca cookie nem url', () => {
  assert.equal(bearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(bearerToken(null), null);
  assert.equal(bearerToken('Bearer token-simples'), null);
  assert.equal(bearerToken('Basic abc.def.ghi'), null);
  assert.equal(bearerToken('Bearer abc.def.ghi\\nInjected: 1'), null);
});

test('hash da instalacao e obrigatoriamente SHA-256 em hexa', () => {
  assert.equal(installationHash({ install_hash: sha }), sha);
  assert.equal(installationHash({ install_hash: 'A'.repeat(64) }), null);
  assert.equal(installationHash({ install_hash: 'short' }), null);
  assert.equal(installationHash({ install_hash: [sha] }), null);
  assert.equal(installationHash(null), null);
});

test('o servidor assina somente paths associados a uma release publicada valida', () => {
  assert.equal(publishedApk(valid), true);
  assert.equal(publishedApk({ ...valid, status: 'draft' }), false);
  assert.equal(publishedApk({ ...valid, version_code: 50 }), false);
  assert.equal(publishedApk({ ...valid, storage_path: '../outro.apk' }), false);
  assert.equal(publishedApk({ ...valid, size_bytes: 0 }), false);
  assert.equal(publishedApk({ ...valid, sha256: 'not-sha' }), false);
});

test('beta v55 aceita apenas draft com hash e caminho corretos, nunca vira release publica', () => {
  const v55 = {
    ...valid,
    version_code: 55,
    version_name: 'Aurora Pulse Beta 55',
    status: 'draft',
    storage_path: 'releases/aeromind-v55-' + sha.slice(0, 16) + '.apk',
  };
  assert.equal(betaApk(v55), true);
  assert.equal(publishedApk(v55), false);
  assert.equal(betaApk({...v55, status: 'published'}), false);
  assert.equal(betaApk({...v55, version_code: 56}), false);
  assert.equal(betaApk({...v55, storage_path: 'releases/outro.apk'}), false);
  assert.equal(betaApk({...v55, size_bytes: 0}), false);
});

test('beta v58 com autorizacao de conta e aparelho pode ser validada sem aceitar qualquer draft', () => {
  const v58 = {
    ...valid,
    version_code: 58,
    version_name: 'Aurora Pulse Historico 58',
    status: 'draft',
    storage_path: 'releases/aeromind-v58-' + sha.slice(0, 16) + '.apk',
  };
  assert.equal(betaApk(v58), true);
  assert.equal(publishedApk(v58), false);
  assert.equal(betaApk({ ...v58, status: 'published' }), false);
  assert.equal(betaApk({ ...v58, version_code: 57 }), false);
  assert.equal(betaApk({ ...v58, version_code: 59 }), false);
  assert.equal(betaApk({ ...v58, sha256: 'b'.repeat(64) }), false);
  assert.equal(betaApk({ ...v58, storage_path: '../outro.apk' }), false);
  assert.equal(betaApk({ ...v58, size_bytes: -1 }), false);
});

test('beta v60 corrigida exige caminho e integridade e não libera drafts de outras versões', () => {
  const v60 = {
    ...valid,
    version_code: 60,
    version_name: 'Aurora Pulse Abertura Estavel 60',
    status: 'draft',
    storage_path: 'releases/aeromind-v60-' + sha.slice(0, 16) + '.apk',
  };
  assert.equal(betaApk(v60), true);
  assert.equal(publishedApk(v60), false);
  assert.equal(betaApk({...v60, version_code: 59}), false);
  assert.equal(betaApk({...v60, version_code: 61}), false);
  assert.equal(betaApk({...v60, sha256: 'x'.repeat(64)}), false);
  assert.equal(betaApk({...v60, storage_path: '../another-release.apk'}), false);
  assert.equal(betaApk({...v60, status: 'published'}), false);
});

test('beta v62 com motor de abertura v13 mantém assinatura e hash por versão', () => {
  const v62 = {
    ...valid,
    version_code: 62,
    version_name: 'Aurora Pulse Jogo V13 62',
    status: 'draft',
    storage_path: 'releases/aeromind-v62-' + sha.slice(0, 16) + '.apk',
  };
  assert.equal(betaApk(v62), true);
  assert.equal(publishedApk(v62), false);
  assert.equal(betaApk({ ...v62, status: 'published' }), false);
  assert.equal(betaApk({ ...v62, version_code: 63 }), false);
  assert.equal(betaApk({ ...v62, storage_path: '../apk.apk' }), false);
  assert.equal(betaApk({ ...v62, sha256: 'invalid' }), false);
});

test('beta privada v64 do iframe Aviator permite somente caminho e hash exatos', () => {
  const v64 = {
    ...valid,
    version_code: 64,
    version_name: 'Aurora Pulse Aviator 64',
    status: 'draft',
    storage_path: 'releases/aeromind-v64-' + sha.slice(0, 16) + '.apk',
  };
  assert.equal(betaApk(v64), true);
  assert.equal(publishedApk(v64), false);
  assert.equal(betaApk({...v64, status: 'published'}), false);
  assert.equal(betaApk({...v64, version_code: 65}), false);
  assert.equal(betaApk({...v64, storage_path: '../arbitrary.apk'}), false);
  assert.equal(betaApk({...v64, sha256: 'x'.repeat(64)}), false);
});

test('beta privada v66 exige integridade e rejeita outros rascunhos', () => {
  const v66 = {
    ...valid,
    version_code: 66,
    version_name: 'Aurora Pulse Coleta Passiva 66',
    status: 'draft',
    storage_path: 'releases/aeromind-v66-' + sha.slice(0,16) + '.apk'
  };
  assert.equal(betaApk(v66), true);
  assert.equal(publishedApk(v66), false);
  assert.equal(betaApk({...v66, status: 'published'}), false);
  assert.equal(betaApk({...v66, version_code: 67}), false);
  assert.equal(betaApk({...v66, storage_path: 'releases/other.apk'}), false);
  assert.equal(betaApk({...v66, sha256: 'x'.repeat(64)}), false);
});

test('beta de recuperação funcional v68 rejeita adulteração de hash e caminho', () => {
  const v68 = {...valid, version_code: 68, version_name: 'Aurora Pulse Estavel 68',
    status: 'draft', storage_path: 'releases/aeromind-v68-' + sha.slice(0,16) + '.apk'};
  assert.equal(betaApk(v68), true);
  assert.equal(publishedApk(v68), false);
  assert.equal(betaApk({...v68, version_code: 69}), false);
  assert.equal(betaApk({...v68, sha256: 'x'.repeat(64)}), false);
  assert.equal(betaApk({...v68, status: 'published'}), false);
  assert.equal(betaApk({...v68, storage_path: '../outro.apk'}), false);
});

test('beta ADM v70 aceita APK assinado com diagnóstico e nunca draft arbitrário', () => {
  const v70={...valid,version_code:70,version_name:'Aurora Pulse Diagnosticos 70',
    status:'draft',storage_path:'releases/aeromind-v70-'+sha.slice(0,16)+'.apk'};
  assert.equal(betaApk(v70),true);
  assert.equal(publishedApk(v70),false);
  assert.equal(betaApk({...v70,version_code:71}),false);
  assert.equal(betaApk({...v70,storage_path:'../v70.apk'}),false);
  assert.equal(betaApk({...v70,sha256:'z'.repeat(64)}),false);
  assert.equal(betaApk({...v70,status:'published'}),false);
});

test('beta ADM v72 aprovada requer APK exato, hash e canal privado', () => {
  const v72={...valid,version_code:72,version_name:'Aurora Pulse Layout Aprovado 72',
    status:'draft',storage_path:'releases/aeromind-v72-'+sha.slice(0,16)+'.apk'};
  assert.equal(betaApk(v72),true);
  assert.equal(publishedApk(v72),false);
  assert.equal(betaApk({...v72,version_code:73}),false);
  assert.equal(betaApk({...v72,storage_path:'../v72.apk'}),false);
  assert.equal(betaApk({...v72,sha256:'z'.repeat(64)}),false);
  assert.equal(betaApk({...v72,status:'published'}),false);
});

test('beta ADM v74 aprovada requer APK exato, hash e canal privado', () => {
  const v74={...valid,version_code:74,version_name:'Aurora Pulse Layout Aprovado 74',
    status:'draft',storage_path:'releases/aeromind-v74-'+sha.slice(0,16)+'.apk'};
  assert.equal(betaApk(v74),true);
  assert.equal(publishedApk(v74),false);
  assert.equal(betaApk({...v74,version_code:75}),false);
  assert.equal(betaApk({...v74,storage_path:'../v74.apk'}),false);
  assert.equal(betaApk({...v74,sha256:'z'.repeat(64)}),false);
  assert.equal(betaApk({...v74,status:'published'}),false);
});
