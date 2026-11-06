import { createPublicKey, verify as verifySignature } from 'node:crypto';

/**
 * Aceita exclusivamente OIDC assinado pelo GitHub Actions para o workflow
 * protegido da branch principal do repositorio privado AeroMind.
 * Nao usa segredo compartilhado nem confia em cabecalhos de caller.
 */
const OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const OIDC_KEYS = OIDC_ISSUER + '/.well-known/jwks';
export const OIDC_AUDIENCE = 'aeromind-mobile-release-ci-v1';
export const OIDC_WORKFLOW = 'aeromindsuporte/AeroMind/.github/workflows/aeromind-distribuir-apk.yml@refs/heads/main';
const OIDC_REPOSITORY = 'aeromindsuporte/AeroMind';
const OIDC_REPOSITORY_ID = '1438670231';

export type CiClaims = Record<string, unknown>;

export function validCiClaims(c: CiClaims, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  return (
    c.iss === OIDC_ISSUER &&
    c.aud === OIDC_AUDIENCE &&
    c.repository === OIDC_REPOSITORY &&
    c.repository_id === OIDC_REPOSITORY_ID &&
    c.repository_visibility === 'private' &&
    c.ref === 'refs/heads/main' &&
    (c.event_name === 'workflow_dispatch' || c.event_name === 'push') &&
    c.workflow_ref === OIDC_WORKFLOW &&
    typeof c.run_id === 'string' && /^[0-9]{4,16}$/.test(c.run_id) &&
    typeof c.iat === 'number' && c.iat <= nowSeconds + 30 &&
    typeof c.exp === 'number' && c.exp > nowSeconds && c.exp <= nowSeconds + 600 &&
    (typeof c.nbf !== 'number' || c.nbf <= nowSeconds + 30)
  );
}

function parseJsonPart(value: string): Record<string, unknown> | null {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

export async function verifyGitHubOidc(header: string | null): Promise<CiClaims | null> {
  if (!header || header.length > 12000 || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  const [h, p, sig] = token.split('.');
  const jwtHeader = parseJsonPart(h);
  const claims = parseJsonPart(p);
  if (!jwtHeader || !claims || !validCiClaims(claims)) return null;
  if (jwtHeader.alg !== 'RS256' || typeof jwtHeader.kid !== 'string' ||
      jwtHeader.kid.length < 1 || jwtHeader.kid.length > 120) return null;
  try {
    const response = await fetch(OIDC_KEYS, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5500),
    });
    if (!response.ok) return null;
    const jwks: unknown = await response.json();
    if (!jwks || typeof jwks !== 'object' || !('keys' in jwks)) return null;
    const keys = (jwks as { keys?: unknown }).keys;
    if (!Array.isArray(keys) || keys.length > 20) return null;
    const key = keys.find((item: unknown) =>
      item && typeof item === 'object' &&
      (item as Record<string, unknown>).kid === jwtHeader.kid &&
      (item as Record<string, unknown>).kty === 'RSA' &&
      (item as Record<string, unknown>).use === 'sig'
    ) as Record<string, unknown> | undefined;
    if (!key) return null;
    const publicKey = createPublicKey({ key: key as import('node:crypto').JsonWebKey, format: 'jwk' });
    const valid = verifySignature(
      'RSA-SHA256',
      Buffer.from(h + '.' + p, 'ascii'),
      publicKey,
      Buffer.from(sig, 'base64url')
    );
    return valid ? claims : null;
  } catch { return null; }
}
