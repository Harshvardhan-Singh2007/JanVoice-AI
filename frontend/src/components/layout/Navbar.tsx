import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Icon } from '../ui/Icon';

const links = ['Home', 'Features', 'About', 'Contact'];

export function Navbar({ isDark, onThemeToggle }: { isDark: boolean; onThemeToggle: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10" aria-label="Main navigation">
        <a href="#home" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white"><span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm text-white shadow-lg shadow-cyan-500/25">J</span>JanVoice <span className="text-cyan-600 dark:text-cyan-400">AI</span></a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => <a key={link} href={`#${link.toLowerCase()}`} className="text-sm font-medium text-slate-600 transition hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400">{link}</a>)}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <button onClick={onThemeToggle} className="rounded-full p-2 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Toggle color theme"><Icon name={isDark ? 'sun' : 'moon'} /></button>
          {user ? <><Link to={`/dashboard/${user.role}`} className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-white">Dashboard</Link><Link to={`/dashboard/${user.role}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/15">Profile</Link><button onClick={handleLogout} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">Logout</button></> : <><Link to="/login" className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-white">Login</Link><Link to="/signup" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 dark:bg-cyan-500 dark:text-slate-950">Sign Up</Link></>}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <button onClick={onThemeToggle} className="rounded-full p-2 text-slate-700 dark:text-white" aria-label="Toggle color theme"><Icon name={isDark ? 'sun' : 'moon'} /></button>
          <button onClick={() => setIsOpen((value) => !value)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white" aria-label="Toggle navigation menu"><Icon name={isOpen ? 'close' : 'menu'} /></button>
        </div>
      </nav>
      {isOpen && <div className="mx-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur md:hidden dark:border-white/10 dark:bg-slate-900/95"><div className="flex flex-col gap-1">{links.map((link) => <a key={link} onClick={() => setIsOpen(false)} href={`#${link.toLowerCase()}`} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">{link}</a>)}{user ? <><Link onClick={() => setIsOpen(false)} to={`/dashboard/${user.role}`} className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold dark:border-white/15">Profile</Link><Link onClick={() => setIsOpen(false)} to={`/dashboard/${user.role}`} className="rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-bold text-slate-950">Dashboard</Link><button onClick={handleLogout} className="rounded-xl px-4 py-3 text-sm font-bold text-rose-600">Logout</button></> : <Link to="/signup" className="mt-2 rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-bold text-slate-950">Create an account</Link>}</div></div>}
    </header>
  );
}
