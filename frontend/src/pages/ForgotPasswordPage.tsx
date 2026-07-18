import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard, FieldError } from '../components/auth/AuthCard';
import { apiClient } from '../lib/api/client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Unable to request a password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Reset your password" subtitle="We'll send a reset link to your email address.">
      {sent ? (
        <div className="mt-7 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800">
          If an account exists for <b>{email}</b>, password reset instructions will be sent when email delivery is enabled.
          <Link to="/login" className="mt-4 block font-bold underline">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="app-label">
            Email address
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="app-input" />
          </label>
          <FieldError message={error} />
          <button disabled={loading} className="flex w-full items-center justify-center app-button">
            {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : 'Send reset link'}
          </button>
          <Link className="block text-center text-sm font-semibold text-[var(--color-primary)]" to="/login">Back to login</Link>
        </form>
      )}
    </AuthCard>
  );
}
