import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50 px-5 py-10 dark:bg-slate-950 sm:grid sm:place-items-center"><div className="mx-auto w-full max-w-md"><Link to="/" className="mb-8 inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white"><span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm text-white">J</span>JanVoice <span className="text-cyan-600">AI</span></Link><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900 sm:p-8"><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>{children}</div></div></div>;
}

export function FieldError({ message }: { message?: string }) { return message ? <p className="mt-1.5 text-xs font-medium text-rose-600">{message}</p> : null; }
