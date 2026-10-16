import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidTargetUrl,
  validateGenerateCount,
  verifyPin,
  MemoryRateLimiter,
  sanitizeBusinessName,
} from './validation.ts';

test('isValidTargetUrl accepts valid http and https URLs', () => {
  const result1 = isValidTargetUrl('https://example.com/products/item-1');
  assert.equal(result1.valid, true);
  assert.equal(result1.normalizedUrl, 'https://example.com/products/item-1');

  const result2 = isValidTargetUrl('http://my-domain.org');
  assert.equal(result2.valid, true);

  const result3 = isValidTargetUrl('http://localhost:3000/test');
  assert.equal(result3.valid, true);
});

test('isValidTargetUrl rejects dangerous protocols and invalid formats', () => {
  assert.equal(isValidTargetUrl('javascript:alert(1)').valid, false);
  assert.equal(isValidTargetUrl('data:text/html;base64,PHNjcmlwdD4=').valid, false);
  assert.equal(isValidTargetUrl('vbscript:msgbox(1)').valid, false);
  assert.equal(isValidTargetUrl('file:///etc/passwd').valid, false);
  assert.equal(isValidTargetUrl('ftp://example.com').valid, false);
  assert.equal(isValidTargetUrl('/relative/path').valid, false);
  assert.equal(isValidTargetUrl('not a url').valid, false);
  assert.equal(isValidTargetUrl('').valid, false);
});

test('validateGenerateCount validates 1 to 20 range correctly', () => {
  assert.equal(validateGenerateCount(1).valid, true);
  assert.equal(validateGenerateCount(10).valid, true);
  assert.equal(validateGenerateCount(20).valid, true);

  assert.equal(validateGenerateCount(0).valid, false);
  assert.equal(validateGenerateCount(-5).valid, false);
  assert.equal(validateGenerateCount(21).valid, false);
  assert.equal(validateGenerateCount(100).valid, false);
  assert.equal(validateGenerateCount('invalid').valid, false);
});

test('verifyPin checks PIN match securely', () => {
  assert.equal(verifyPin('140405', '140405'), true);
  assert.equal(verifyPin(' 140405 ', '140405'), true);
  assert.equal(verifyPin('000000', '140405'), false);
  assert.equal(verifyPin('', '140405'), false);
  assert.equal(verifyPin(undefined, '140405'), false);
});

test('MemoryRateLimiter throttles requests after limit', () => {
  const limiter = new MemoryRateLimiter(1000, 3);
  const ip = '127.0.0.1';

  assert.equal(limiter.check(ip).allowed, true);
  assert.equal(limiter.check(ip).allowed, true);
  assert.equal(limiter.check(ip).allowed, true);

  // 4th request exceeds max 3
  const fourth = limiter.check(ip);
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.remaining, 0);
  assert.ok(fourth.resetMs > 0);
});

test('sanitizeBusinessName trims, limits to 100 chars, and returns null for empty', () => {
  assert.equal(sanitizeBusinessName('  Toko Kopi Senja  '), 'Toko Kopi Senja');
  assert.equal(sanitizeBusinessName(''), null);
  assert.equal(sanitizeBusinessName('   '), null);
  assert.equal(sanitizeBusinessName(null), null);
  assert.equal(sanitizeBusinessName(undefined), null);

  const longName = 'A'.repeat(120);
  const sanitized = sanitizeBusinessName(longName);
  assert.equal(sanitized?.length, 100);
});

