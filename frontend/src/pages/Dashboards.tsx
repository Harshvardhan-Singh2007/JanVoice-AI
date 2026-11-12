import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { StaffComplaintWorkspace } from '../components/dashboard/StaffComplaintWorkspace';
import { Icon, type IconName } from '../components/ui/Icon';
import { useAuth } from '../features/auth/useAuth';
import { getAdminNotifications, getAdminStatistics, getRecentActivity, type AdminActivity, type AdminNotification, type AdminStatistics, type DistributionItem } from '../features/admin/adminApi';

export function CitizenDashboard() {
  return <DashboardLayout title="Your reports" subtitle="Submit civic reports and review their saved status history." cards={[{ title: 'Report an issue', detail: 'Submit text and an optional image, GPS location, or speech transcript.', icon: 'mic', to: '/dashboard/citizen/report' }, { title: 'My reports', detail: 'Review reports you submitted and edit eligible details.', icon: 'tracking', to: '/dashboard/citizen/reports' }, { title: 'Notifications', detail: 'See updates recorded for your reports.', icon: 'check', to: '/dashboard/citizen/notifications' }]} />;
}

export function AuthorityDashboard() {
  return <DashboardLayout title="Authority complaint workflow" subtitle="Review reports assigned to your department and record updates in JAN Voice AI." cards={[]}><StaffComplaintWorkspace /></DashboardLayout>;
}

type Metric = { title: string; value?: number; detail: string; icon: IconName; tone: string };

const adminLinks = [
  { label: 'Overview', href: '#admin-dashboard' },
  { label: 'Complaint queue', href: '#complaint-queue' },
  { label: 'Authority scopes', href: '#authority-scopes' },
  { label: 'Analytics', href: '#admin-analytics' },
  { label: 'Activity', href: '#admin-activity' },
  { label: 'Notifications', href: '#admin-notifications' },
];

export function AdminDashboard() {
  const [statistics, setStatistics] = useState<AdminStatistics>();
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, recent, alerts] = await Promise.all([getAdminStatistics(), getRecentActivity(), getAdminNotifications()]);
      setStatistics(stats);
      setActivity(recent);
      setNotifications(alerts);
      setError('');
    } catch {
      setError('Unable to load all admin overview data. Retry to refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    const interval = window.setInterval(() => void loadDashboard(), 30000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const metrics: Metric[] = [
    { title: 'Users', value: statistics?.totalUsers, detail: 'accounts in database', icon: 'community', tone: 'bg-violet-100 text-violet-700' },
    { title: 'Reports', value: statistics?.totalIssues, detail: 'stored reports', icon: 'tracking', tone: 'bg-sky-100 text-sky-700' },
    { title: 'Pending', value: statistics?.pendingIssues, detail: 'awaiting staff action', icon: 'route', tone: 'bg-amber-100 text-amber-800' },
    { title: 'In progress', value: statistics?.inProgressIssues, detail: 'current workflow status', icon: 'building', tone: 'bg-cyan-100 text-cyan-800' },
    { title: 'Resolved', value: statistics?.resolvedIssues, detail: 'marked resolved in JAN Voice AI', icon: 'check', tone: 'bg-emerald-100 text-emerald-800' },
  ];

  const signOut = () => { logout(); navigate('/'); };

  return <div id="admin-dashboard" className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <Link to="/" className="flex items-center gap-3 text-lg font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white">J</span>JAN Voice AI</Link>
      <p className="mt-9 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Admin workspace</p>
      <nav aria-label="Admin navigation" className="mt-3 space-y-1">{adminLinks.map((item) => <a key={item.href} href={item.href} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-800">{item.label}</a>)}<span aria-disabled="true" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-400">User management <span className="text-[10px]">Planned</span></span></nav>
      <div className="mt-auto border-t border-slate-200 pt-4"><p className="truncate text-sm font-bold">{user?.fullName ?? 'Admin'}</p><p className="mt-1 text-xs capitalize text-slate-500">{user?.role}</p><button onClick={signOut} className="app-button-secondary mt-4 w-full">Sign out</button></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-7">
        <div className="flex items-center justify-between gap-4"><Link to="/" className="font-bold lg:hidden">JAN Voice AI · Admin</Link><p className="hidden text-sm text-slate-600 lg:block">Report data and workflow status stored in this application</p><div className="flex gap-2"><button onClick={() => void loadDashboard()} disabled={loading} className="app-button-secondary disabled:opacity-50">Refresh overview</button><button onClick={signOut} className="app-button-secondary">Sign out</button></div></div>
        <nav aria-label="Admin mobile navigation" className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">{adminLinks.map((item) => <a key={item.href} href={item.href} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">{item.label}</a>)}</nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-7">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Admin workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Platform overview</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Database-backed reports and account counts. “Resolved” means a staff member recorded that status here; it does not indicate government verification.</p>
        {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button onClick={() => void loadDashboard()} className="font-bold underline">Retry</button></div>}
        <section aria-label="Platform statistics" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map((metric) => <MetricCard key={metric.title} metric={metric} loading={loading} />)}</section>
        <section id="admin-analytics" className="mt-5 grid gap-4 lg:grid-cols-3"><Distribution title="Category distribution" icon="building" items={statistics?.categories ?? []} loading={loading} /><Distribution title="Status distribution" icon="tracking" items={statistics?.statuses ?? []} loading={loading} /><Distribution title="Priority distribution" icon="route" items={statistics?.priorities ?? []} loading={loading} /></section>
        <section className="mt-5 grid gap-4 xl:grid-cols-2"><Activity id="admin-activity" items={activity} loading={loading} /><Notifications id="admin-notifications" items={notifications} loading={loading} /></section>
      </main>
    </div>
  </div>;
}

export function AdminDashboardPage() {
  return <><AdminDashboard /><div id="complaint-queue" className="scroll-mt-24 bg-slate-50 px-4 py-8 sm:px-7"><div className="mx-auto max-w-7xl"><StaffComplaintWorkspace /></div></div></>;
}

function MetricCard({ metric, loading }: { metric: Metric; loading: boolean }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl ${metric.tone}`}><Icon name={metric.icon} className="h-5 w-5" /></span><p className="mt-4 text-sm font-semibold text-slate-600">{metric.title}</p><p className="mt-1 text-3xl font-bold">{loading || metric.value === undefined ? '—' : metric.value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></article>;
}

function Distribution({ title, icon, items, loading }: { title: string; icon: IconName; items: DistributionItem[]; loading: boolean }) {
  const highest = Math.max(...items.map((item) => item.count), 1);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold"><Icon name={icon} className="h-4 w-4 text-blue-700" />{title}</h2>{loading ? <p role="status" className="mt-5 text-sm text-slate-500">Loading...</p> : <div className="mt-5 space-y-4">{items.map((item) => <div key={item.label}><div className="flex justify-between gap-3 text-sm"><span className="truncate">{item.label}</span><span className="font-semibold">{item.count}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${(item.count / highest) * 100}%` }} /></div></div>)}{items.length === 0 && <p className="py-3 text-sm text-slate-500">No report data yet.</p>}</div>}</section>;
}

function Activity({ id, items, loading }: { id: string; items: AdminActivity[]; loading: boolean }) {
  return <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Recent report activity</h2>{loading ? <p role="status" className="mt-4 text-sm text-slate-500">Loading activity...</p> : items.length ? <ul className="mt-4 divide-y divide-slate-100">{items.slice(0, 6).map((item) => <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.category} · {item.assignedDepartment ?? 'Unassigned'} · {new Date(item.updatedAt).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{item.status}</span></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No report activity yet.</p>}</section>;
}

function Notifications({ id, items, loading }: { id: string; items: AdminNotification[]; loading: boolean }) {
  return <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Operational alerts</h2><p className="mt-1 text-xs text-slate-500">Generated from reports stored in JAN Voice AI.</p>{loading ? <p role="status" className="mt-4 text-sm text-slate-500">Loading alerts...</p> : items.length ? <ul className="mt-4 space-y-3">{items.map((item) => <li key={item._id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-semibold">{item.title} {item.emergency && <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Urgent flag</span>}</p><p className="mt-1 text-xs text-slate-500">{item.status} · {item.priority} priority · {new Date(item.updatedAt).toLocaleString()}</p></div><Icon name="route" className="mt-1 h-4 w-4 shrink-0 text-blue-700" /></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No operational alerts.</p>}</section>;
}
