import { createHash, randomInt } from 'node:crypto'

const OTP_LENGTH = 6
export const OTP_TTL_MINUTES = 5
export const OTP_RESEND_COOLDOWN_SECONDS = 45
export const OTP_MAX_ATTEMPTS = 5

export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0')
}

export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}
