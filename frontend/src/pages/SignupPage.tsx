import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard, FieldError } from '../components/auth/AuthCard';
import { useAuth } from '../features/auth/useAuth';
import { getAuthErrorMessage } from '../features/auth/authErrors';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.fullName.trim().length < 2) return setError('Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('Enter a valid phone number.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setError('');
    setLoading(true);
    try {
      const user = await signup({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password });
      navigate(`/dashboard/${user.role}`);
    } catch (cause) {
      setError(getAuthErrorMessage(cause, 'Unable to create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Join JAN Voice AI" subtitle="Create a Citizen account to submit and follow reports in this prototype.">
      <form onSubmit={submit} className="mt-7 grid gap-4">
        <label className="app-label">
          Full Name
          <input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className="app-input" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="app-label">
            Email
            <input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" className="app-input" />
          </label>
          <label className="app-label">
            Phone
            <input value={form.phone} onChange={(e) => update('phone', e.target.value)} type="tel" className="app-input" />
          </label>
        </div>
        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Public signup creates a Citizen account. Admin and Authority access is provisioned separately for approved demo staff.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="app-label">
            Password
            <input value={form.password} onChange={(e) => update('password', e.target.value)} type="password" className="app-input" />
          </label>
          <label className="app-label">
            Confirm Password
            <input value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} type="password" className="app-input" />
          </label>
        </div>
        <FieldError message={error} />
        <button disabled={loading} className="flex w-full items-center justify-center app-button">
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already have an account? <Link className="font-bold text-[var(--color-primary)]" to="/login">Login</Link>
        </p>
      </form>
    </AuthCard>
  );
}
