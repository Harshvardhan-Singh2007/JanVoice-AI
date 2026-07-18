import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Icon } from '../ui/Icon';

const links = ['Home', 'Features', 'About', 'Contact'];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10" aria-label="Main navigation">
        <a href="#home" className="app-brand">
          <span className="app-brand-mark">J</span>
          JanVoice <span className="text-[var(--color-primary)]">AI</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <a key={link} href={`#${link.toLowerCase()}`} className="text-sm font-medium text-slate-600 transition hover:text-[var(--color-primary)]">
              {link}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to={`/dashboard/${user.role}`} className="app-button-secondary">Dashboard</Link>
              <Link to={`/dashboard/${user.role}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                Profile
              </Link>
              <button onClick={handleLogout} className="app-button">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="app-button-secondary">Login</Link>
              <Link to="/signup" className="app-button">Sign Up</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <button onClick={() => setIsOpen((value) => !value)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-sm" aria-label="Toggle navigation menu">
            <Icon name={isOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </nav>
      {isOpen && (
        <div className="mx-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a key={link} onClick={() => setIsOpen(false)} href={`#${link.toLowerCase()}`} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {link}
              </a>
            ))}
            {user ? (
              <>
                <Link onClick={() => setIsOpen(false)} to={`/dashboard/${user.role}`} className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700">
                  Profile
                </Link>
                <Link onClick={() => setIsOpen(false)} to={`/dashboard/${user.role}`} className="rounded-xl bg-[var(--color-primary)] px-4 py-3 text-center text-sm font-bold text-white">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="rounded-xl px-4 py-3 text-sm font-bold text-rose-600">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/signup" className="mt-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-center text-sm font-bold text-white">
                Create an account
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
