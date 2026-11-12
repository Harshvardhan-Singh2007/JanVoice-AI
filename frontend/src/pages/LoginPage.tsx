import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard, FieldError } from '../components/auth/AuthCard';
import { useAuth } from '../features/auth/useAuth';
import { getAuthErrorMessage } from '../features/auth/authErrors';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password, rememberMe);
      navigate(`/dashboard/${user.role}`);
    } catch (cause) {
      setError(getAuthErrorMessage(cause, 'Unable to sign in. Check your credentials and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to manage your reports in JAN Voice AI.">
      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="app-label">
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="app-input" />
        </label>
        <label className="app-label">
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className="app-input" />
        </label>
        <FieldError message={error} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" className="accent-[var(--color-primary)]" />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-semibold text-[var(--color-primary)]">Forgot password?</Link>
        </div>
        <button disabled={loading} className="flex w-full items-center justify-center app-button">
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : 'Login'}
        </button>
        <p className="text-center text-sm text-slate-600">
          New to JAN Voice? <Link className="font-bold text-[var(--color-primary)]" to="/signup">Create an account</Link>
        </p>
      </form>
    </AuthCard>
  );
}
