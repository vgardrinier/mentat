import crypto from 'crypto';

/**
 * Sign a webhook payload using HMAC-SHA256
 * @param payload - The payload to sign (typically JSON string)
 * @param secret - The shared secret key
 * @returns Hex-encoded HMAC signature (64 chars)
 */
export function signWebhook(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Sign a webhook payload with timestamp (prevents replay attacks)
 * @param payload - The payload to sign (typically JSON string)
 * @param timestamp - Unix timestamp in milliseconds
 * @param secret - The shared secret key
 * @returns Hex-encoded HMAC signature (64 chars)
 */
export function signWebhookWithTimestamp(
  payload: string,
  timestamp: string,
  secret: string
): string {
  const signedContent = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(signedContent).digest('hex');
}

/**
 * Verify a webhook signature using constant-time comparison
 * @param payload - The payload that was signed
 * @param signature - The hex-encoded signature to verify (should be 64 chars)
 * @param secret - The shared secret key
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Validate signature format (HMAC-SHA256 produces 64 hex chars)
  if (!signature || signature.length !== 64) {
    return false;
  }

  // Verify signature is valid hex
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const expectedSignature = signWebhook(payload, secret);

  // Use constant-time comparison to prevent timing attacks
  // Compare as hex buffers, not UTF-8 string bytes
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    // If buffers are different lengths or invalid hex, timingSafeEqual throws
    return false;
  }
}

/**
 * Verify webhook with timestamp to prevent replay attacks
 *
 * IMPORTANT: This function expects the signature to cover BOTH timestamp and payload:
 * signature = HMAC(secret, timestamp + "." + payload)
 *
 * This prevents an attacker from replaying an old request with a fresh timestamp.
 *
 * @param payload - The payload that was signed
 * @param signature - The hex-encoded signature (64 chars)
 * @param timestamp - Unix timestamp in milliseconds (as string)
 * @param secret - The shared secret key
 * @param maxAgeSeconds - Maximum age of timestamp (default: 300 = 5 minutes)
 * @returns Object with valid flag and optional error message
 */
export function verifyWebhookWithTimestamp(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string,
  maxAgeSeconds: number = 300 // 5 minutes default
): { valid: boolean; error?: string } {
  // Validate signature format first (fail fast)
  if (!signature || signature.length !== 64) {
    return { valid: false, error: 'Invalid signature format' };
  }

  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return { valid: false, error: 'Signature must be 64 hex characters' };
  }

  // Check timestamp age
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);

  if (isNaN(requestTime)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  const age = (now - requestTime) / 1000;

  if (age > maxAgeSeconds) {
    return { valid: false, error: 'Webhook timestamp too old (possible replay attack)' };
  }

  if (age < -30) {
    return { valid: false, error: 'Webhook timestamp is in the future' };
  }

  // Verify signature (timestamp is now INCLUDED in signature)
  // This binds authenticity to freshness - changing timestamp breaks signature
  const expectedSignature = signWebhookWithTimestamp(payload, timestamp, secret);

  // Use constant-time comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }
  } catch {
    return { valid: false, error: 'Signature verification failed' };
  }

  return { valid: true };
}
