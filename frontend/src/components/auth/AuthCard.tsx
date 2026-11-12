import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-5 py-10 sm:grid sm:place-items-center">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="app-brand mb-8">
          <span className="app-brand-mark">J</span>
          JAN Voice <span className="text-[var(--color-primary)]">AI</span>
        </Link>
        <div className="app-card p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="app-error mt-1.5">{message}</p> : null;
}
