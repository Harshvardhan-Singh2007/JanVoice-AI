import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AxiosError } from 'axios';
import { getAuthErrorMessage } from '../src/features/auth/authErrors.js';

test('auth API validation errors show field names and messages', () => {
  const error = {
    isAxiosError: true,
    response: { data: { message: 'Request validation failed.', errors: [{ field: 'email', message: 'A valid email is required.' }] } },
  } as unknown as AxiosError<{ message: string; errors: Array<{ field: string; message: string }> }>;
  assert.equal(getAuthErrorMessage(error, 'fallback'), 'email: A valid email is required.');
});

test('auth API messages and unavailable backend errors are shown safely', () => {
  const apiError = {
    isAxiosError: true,
    response: { data: { message: 'An account with this email already exists.' } },
  } as unknown as AxiosError<{ message: string }>;
  const connectionError = { isAxiosError: true } as AxiosError;

  assert.equal(getAuthErrorMessage(apiError, 'fallback'), 'An account with this email already exists.');
  assert.match(getAuthErrorMessage(connectionError, 'fallback'), /backend is running/);
});
