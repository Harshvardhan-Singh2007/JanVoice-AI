import { Link } from 'react-router-dom';

export function NotFoundPage() { return <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-center dark:bg-slate-950"><div><p className="text-7xl font-bold text-cyan-500">404</p><h1 className="mt-4 text-3xl font-bold">This route is not on the map.</h1><p className="mt-3 text-slate-600 dark:text-slate-300">The page you are looking for does not exist.</p><Link to="/" className="mt-7 inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950">Back home</Link></div></main>; }
