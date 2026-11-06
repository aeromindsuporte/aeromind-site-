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
