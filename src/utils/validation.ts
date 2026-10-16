/**
 * Validation and security helper functions for QR Code Generator
 */

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Validates that the URL is a secure http/https web URL.
 * Strictly rejects javascript:, data:, file:, vbscript:, and relative paths.
 */
export function isValidTargetUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL tujuan tidak boleh kosong.' };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'URL tujuan tidak boleh kosong.' };
  }

  // Reject dangerous pseudo-protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('about:')
  ) {
    return { valid: false, error: 'Protokol URL tidak diizinkan. Gunakan http:// atau https://.' };
  }

  // Must begin with http:// or https://
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    return {
      valid: false,
      error: 'URL harus dimulai dengan http:// atau https:// (contoh: https://contoh.com)',
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Protokol URL harus berupa http atau https.' };
    }

    if (!parsed.hostname || parsed.hostname.length < 3 || !parsed.hostname.includes('.')) {
      // Allow localhost for dev testing
      if (parsed.hostname !== 'localhost' && !parsed.hostname.endsWith('.localhost')) {
        return { valid: false, error: 'Nama domain pada URL tidak valid.' };
      }
    }

    return { valid: true, normalizedUrl: parsed.toString() };
  } catch {
    return { valid: false, error: 'Format URL tidak valid.' };
  }
}

/**
 * Validates count for batch generation (1 to 20).
 */
export function validateGenerateCount(countInput: unknown): { valid: boolean; count: number; error?: string } {
  const count = typeof countInput === 'number' ? countInput : parseInt(String(countInput), 10);
  if (isNaN(count)) {
    return { valid: false, count: 0, error: 'Jumlah QR code harus berupa angka.' };
  }
  if (count < 1) {
    return { valid: false, count, error: 'Jumlah QR code minimal 1.' };
  }
  if (count > 20) {
    return { valid: false, count, error: 'Jumlah QR code maksimal 20 per generate.' };
  }
  return { valid: true, count: Math.floor(count) };
}

/**
 * Sanitizes optional business name: trims whitespace, limits to 100 characters.
 * Returns null if empty.
 */
export function sanitizeBusinessName(rawName: unknown): string | null {
  if (typeof rawName !== 'string') return null;
  const trimmed = rawName.trim();
  if (trimmed.length === 0) return null;
  return trimmed.substring(0, 100);
}

/**
 * Validates PIN format and matches with server secret.
 */
export function verifyPin(inputPin: string | undefined | null, actualPin: string): boolean {
  if (!inputPin || typeof inputPin !== 'string') {
    return false;
  }
  const cleanInput = inputPin.trim();
  const cleanActual = actualPin.trim();
  if (cleanInput.length === 0 || cleanActual.length === 0) {
    return false;
  }
  return cleanInput === cleanActual;
}

/**
 * Simple in-memory rate limiter per IP address.
 */
export class MemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60 * 1000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  public check(ip: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];

    // Filter out expired timestamps
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      const oldest = validTimestamps[0];
      const resetMs = Math.max(0, this.windowMs - (now - oldest));
      this.requests.set(ip, validTimestamps);
      return { allowed: false, remaining: 0, resetMs };
    }

    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - validTimestamps.length,
      resetMs: this.windowMs,
    };
  }

  public reset(ip?: string) {
    if (ip) {
      this.requests.delete(ip);
    } else {
      this.requests.clear();
    }
  }
}
