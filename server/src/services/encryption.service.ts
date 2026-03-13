import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';
import { env } from '../config/env';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function key(): Buffer {
  const raw = env.ENCRYPTION_KEY;
  const hex = raw.replace(/[^0-9a-fA-F]/g, '').padEnd(64, '0').slice(0, 64);
  return Buffer.from(hex, 'hex');
}

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url');
}

export function decrypt(data: string): string {
  const buf = Buffer.from(data, 'base64url');
  const iv  = buf.slice(0, IV_LEN);
  const tag = buf.slice(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.slice(IV_LEN + TAG_LEN);
  const d   = createDecipheriv(ALGO, key(), iv);
  d.setAuthTag(tag);
  return d.update(enc).toString('utf8') + d.final('utf8');
}

export function hmac(value: string): string {
  return createHmac('sha256', env.HMAC_SECRET).update(value).digest('hex');
}

export function hashEmail(email: string) {
  const norm = email.toLowerCase().trim();
  return { hmac: hmac(norm), encrypted: encrypt(norm) };
}
