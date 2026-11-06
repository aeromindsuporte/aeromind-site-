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
