import {createHmac, timingSafeEqual} from 'node:crypto';

export const MAX_PIX_WEBHOOK_BYTES = 65_536;
const successEvents = new Set(['transaction.succeeded', 'pix.cashin.succeeded']);

export function verifyPaggpaySignature(
  raw: string,
  signature: string | null,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !signature || Buffer.byteLength(raw, 'utf8') > MAX_PIX_WEBHOOK_BYTES) return false;
  const match = /^t=(\d+),v1=([0-9a-f]{64})$/i.exec(signature);
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return false;
  const expected = createHmac('sha256', secret).update(match[1] + '.' + raw).digest();
  const received = Buffer.from(match[2], 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

type PixEvent = {
  kind: 'success';
  eventId: string;
  referenceId: string;
  transactionId: string;
  amountCents: number;
};
type PixIgnored = {kind: 'ignored'};
type PixInvalid = {kind: 'invalid'};

export function parsePaggpayEvent(raw: string): PixEvent | PixIgnored | PixInvalid {
  let event: unknown;
  try { event = JSON.parse(raw); } catch { return {kind: 'invalid'}; }
  if (!event || typeof event !== 'object' || Array.isArray(event)) return {kind: 'invalid'};
  const envelope = event as Record<string, unknown>;
  if (typeof envelope.id !== 'string' || envelope.id.length < 8 || envelope.id.length > 120) return {kind: 'invalid'};
  if (!successEvents.has(String(envelope.event || ''))) return {kind: 'ignored'};
  if (!envelope.data || typeof envelope.data !== 'object' || Array.isArray(envelope.data)) return {kind: 'invalid'};
  const data = envelope.data as Record<string, unknown>;
  if (typeof data.reference_id !== 'string' || !/^aeromind-[0-9a-f-]{36}$/i.test(data.reference_id)) return {kind: 'invalid'};
  if (typeof data.id !== 'string' || !data.id || data.id.length > 128) return {kind: 'invalid'};
  const cents = typeof data.value === 'number'
    ? data.value
    : typeof data.value === 'string' && /^\d+$/.test(data.value) ? Number(data.value) : NaN;
  if (!Number.isSafeInteger(cents) || cents <= 0) return {kind: 'invalid'};
  return {kind: 'success',eventId: envelope.id,referenceId: data.reference_id,transactionId: data.id,amountCents: cents};
}
