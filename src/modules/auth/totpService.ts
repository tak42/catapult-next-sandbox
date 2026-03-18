import { createHmac } from 'node:crypto';

const TOTP_STEP_SECONDS = 30;

function getTimeStepCounter(timeMs: number): number {
  return Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS);
}

function decodeBase32(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = base32.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function generateTotp(secretBase32: string, counter: number): string {
  const key = decodeBase32(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const otp = binary % 1_000_000;

  return otp.toString().padStart(6, '0');
}

export function verifyTotpCodeWithSecret(
  secretBase32: string,
  code: string,
  nowMs: number,
): boolean {
  const counter = getTimeStepCounter(nowMs);

  return [counter - 1, counter, counter + 1].some((windowCounter) => {
    return generateTotp(secretBase32, windowCounter) === code;
  });
}
