import axios from 'axios';

interface AuthApiErrorBody {
  message?: unknown;
  errors?: Array<{ field?: unknown; message?: unknown }>;
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<AuthApiErrorBody>(error)) return fallback;

  const body = error.response?.data;
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    return body.errors
      .map((item) => `${typeof item.field === 'string' ? `${item.field}: ` : ''}${typeof item.message === 'string' ? item.message : 'Invalid value.'}`)
      .join(' ');
  }
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (!error.response) return 'Cannot reach the JAN Voice AI service. Check that the backend is running, then try again.';
  return fallback;
}
