// Validadores puros para a rota Android. Nunca aceitam caminho de arquivo enviado pelo cliente.
export type PublishedApk = {
  id: string;
  version_code: number;
  version_name: string;
  storage_path: string;
  sha256: string;
  size_bytes: number;
  status: 'published';
};

export function bearerToken(header: string | null): string | null {
  if (!header || header.length > 8200) return null;
  const m = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(header);
  return m?.[1] ?? null;
}

export function installationHash(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const hash = (payload as Record<string, unknown>).install_hash;
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) ? hash : null;
}

export type BetaApk = Omit<PublishedApk, 'status'> & { status: 'draft' };

function validApk(value: unknown, expectedStatus: 'published' | 'draft'): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (r.status !== expectedStatus || typeof r.id !== 'string' || !r.id) return false;
  if (!Number.isSafeInteger(r.version_code) || (r.version_code as number) <= 0) return false;
  if (typeof r.version_name !== 'string' || r.version_name.length < 1 || r.version_name.length > 40) return false;
  if (typeof r.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(r.sha256)) return false;
  if (!Number.isSafeInteger(r.size_bytes) || (r.size_bytes as number) < 20000 || (r.size_bytes as number) > 100_000_000) return false;
  const path = 'releases/aeromind-v' + r.version_code + '-' + r.sha256.slice(0, 16) + '.apk';
  return r.storage_path === path;
}

/** O beta e visivel somente apos verificacao de conta, aparelho e concessao no RPC. */
export function betaApk(value: unknown): value is BetaApk {
  // Somente as betas de homologacao v55, v58, v60, v62, v64, v66, v68, v70, v72 v74 e v76 sao reconhecidas pelo site.
  // A permissao por usuario + instalacao continua exclusiva dos RPCs privados.
  if (!validApk(value, 'draft')) return false;
  return [55, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 79, 80, 81].includes((value as BetaApk).version_code);
}

export function publishedApk(value: unknown): value is PublishedApk {
  return validApk(value, 'published');
}
