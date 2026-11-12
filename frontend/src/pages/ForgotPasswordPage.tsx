import { Link } from 'react-router-dom';
import { AuthCard } from '../components/auth/AuthCard';

export function ForgotPasswordPage() {
  return <AuthCard title="Password reset" subtitle="Email delivery is not configured in this prototype.">
    <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
      <p>Password reset links cannot be sent from JAN Voice AI yet. For a buildathon demo account, contact the person managing the isolated demo environment.</p>
      <Link to="/login" className="mt-4 inline-block font-bold underline">Return to sign in</Link>
    </div>
  </AuthCard>;
}
