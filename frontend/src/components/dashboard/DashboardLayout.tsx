import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { Icon, type IconName } from '../ui/Icon';

export function DashboardLayout({
  title,
  subtitle,
  cards,
  children,
}: {
  title: string;
  subtitle: string;
  cards: { title: string; detail: string; icon: IconName; accent?: string; to?: string }[];
  children?: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="app-brand">
            <span className="app-brand-mark">J</span>
            JAN Voice <span className="text-[var(--color-primary)]">AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{user?.fullName}</p>
              <p className="text-xs capitalize text-slate-500">{user?.role}</p>
            </div>
            <button onClick={signOut} className="app-button-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p className="app-section-label">{user?.role} workspace</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-slate-600">{subtitle}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className={`group app-panel p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${card.accent ?? ''}`}
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-[var(--color-primary)]">
                <Icon name={card.icon} />
              </div>
              <h2 className="mt-6 text-lg font-bold">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.detail}</p>
              {card.to ? <Link to={card.to} className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]">Open <Icon name="arrow" className="h-4 w-4" /></Link> : <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-500">Planned</span>}
            </article>
          ))}
        </div>
        {children && <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{children}</section>}
      </main>
    </div>
  );
}

