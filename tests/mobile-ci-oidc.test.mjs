import assert from 'node:assert/strict';
import test from 'node:test';
import { validCiClaims, OIDC_AUDIENCE, OIDC_WORKFLOW } from '../lib/mobile/github-ci-oidc.ts';

const t=Math.floor(Date.now()/1000);
const base={
  iss:'https://token.actions.githubusercontent.com',
  aud:OIDC_AUDIENCE,
  repository:'aeromindsuporte/AeroMind',
  repository_id:'1438670231',
  repository_visibility:'private',
  ref:'refs/heads/main',
  event_name:'workflow_dispatch',
  workflow_ref:OIDC_WORKFLOW,
  run_id:'42120911516',
  iat:t-30,
  exp:t+240,
};
test('claims aceitam somente workflow especifico da main privada',()=>{
  assert.equal(validCiClaims(base,t),true);
  assert.equal(validCiClaims({...base,event_name:'push'},t),true);
  for(const [key,value] of Object.entries({
    repository:'other/private',
    repository_id:'100',
    repository_visibility:'public',
    ref:'refs/heads/teste',
    workflow_ref:'aeromindsuporte/AeroMind/.github/workflows/other.yml@refs/heads/main',
    event_name:'pull_request',
    aud:'other',
    iss:'https://attacker.com',
    exp:t-2,
    iat:t+200,
    run_id:'not-a-number',
  })) {
    assert.equal(validCiClaims({...base,[key]:value},t),false,'rejeita '+key);
  }
});
