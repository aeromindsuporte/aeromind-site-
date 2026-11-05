import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerToken, installationHash, publishedApk } from '../lib/mobile/apk-validation.ts';

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
