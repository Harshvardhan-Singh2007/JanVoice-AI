import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { IssueCard } from '../components/citizen/IssueCard';
import { Timeline } from '../components/citizen/Timeline';
import { Icon } from '../components/ui/Icon';
import { getMyIssuesPage, getMyIssueUpdates, updateMyIssue, type ApiIssue, type ApiIssueUpdate, type IssuePagination, type UpdateMyIssueRequest } from '../features/issues/issueApi';
import type { IssuePriority, IssueStatus } from '../types/issue';

const updateErrorMessage = (error: unknown, fallback: string): string =>
  isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback;

export function MyReportsPage() {
  const [reports, setReports] = useState<ApiIssue[]>([]);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<'All' | IssueStatus>('All');
  const [priority, setPriority] = useState<'All' | IssuePriority>('All');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<IssuePagination>();
  const [selected, setSelected] = useState<ApiIssue>();
  const [editing, setEditing] = useState<ApiIssue>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const mounted = useRef(false);
  const hasReports = useRef(false);
  const requestSequence = useRef(0);

  const loadReports = useCallback(async (showLoading = false) => {
    if (!mounted.current) return;
    const requestId = ++requestSequence.current;
    if (showLoading) setLoading(true);
    try {
      const result = await getMyIssuesPage(page, 10, {
        ...(status !== 'All' ? { status } : {}),
        ...(priority !== 'All' ? { priority } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
        sort,
      });
      if (!mounted.current || requestId !== requestSequence.current) return;
      setReports(result.issues);
      hasReports.current = result.pagination.total > 0;
      setPagination(result.pagination);
      setError('');
      setLastUpdated(new Date());
    } catch {
      if (mounted.current && requestId === requestSequence.current) setError(hasReports.current ? 'Unable to refresh reports. Showing the last data loaded; retry to check for updates.' : 'Unable to load your reports. Please retry.');
    } finally {
      if (mounted.current && requestId === requestSequence.current) setLoading(false);
    }
  }, [page, status, priority, category, searchQuery, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    mounted.current = true;
    void loadReports(true);
    const interval = window.setInterval(() => { void loadReports(); }, 60000);
    return () => { mounted.current = false; window.clearInterval(interval); };
  }, [loadReports]);

  const reportSaved = (updated: ApiIssue) => {
    setReports((current) => current.map((report) => report._id === updated._id ? updated : report));
    setEditing(undefined);
  };

  return <div className="p-5 sm:p-8 lg:p-10">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-600">Issue archive</p><h1 className="mt-3 text-3xl font-bold tracking-tight">My reports</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Review reports you submitted and their saved status history.</p><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Statuses and updates are recorded by staff in JAN Voice AI. They do not verify government receipt or action.</p></div>
      <Link to="/dashboard/citizen/report" className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950">New report</Link>
    </div>
    <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-white/10 dark:bg-white/[.04]">
      <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search reports" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5" />
      <select value={status} onChange={(event) => { setStatus(event.target.value as 'All' | IssueStatus); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"><option value="All">All statuses</option>{(['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'] as IssueStatus[]).map((item) => <option key={item}>{item}</option>)}</select>
      <select value={priority} onChange={(event) => { setPriority(event.target.value as 'All' | IssuePriority); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"><option value="All">All priorities</option>{(['Critical', 'High', 'Medium', 'Low'] as IssuePriority[]).map((item) => <option key={item}>{item}</option>)}</select>
      <input value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} maxLength={80} placeholder="Category" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5" />
      <select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="priority">Priority</option></select>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      {loading && <p role="status" className="text-slate-500">Loading reports...</p>}
      {lastUpdated && <p className="text-slate-500">{pagination?.total ?? 0} reports · Last refreshed {lastUpdated.toLocaleTimeString()}</p>}
      <button onClick={() => void loadReports(true)} disabled={loading} className="font-bold text-cyan-700 underline disabled:opacity-50">Refresh reports</button>
    </div>
    {error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => void loadReports(true)} className="font-bold underline">Retry</button></div>}
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      {reports.map((report) => <IssueCard key={report._id} issue={report} onEdit={setEditing} onTrack={setSelected} />)}
      {!loading && !error && reports.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-white/15">{pagination?.total ? 'No reports match these filters.' : 'You have not submitted any reports yet.'}</p>}
    </div>
    {pagination && (pagination.totalPages > 1 || pagination.page > 1) && <nav aria-label="Report pages" className="mt-6 flex items-center justify-center gap-4"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={!pagination.hasPreviousPage || loading} className="app-button-secondary disabled:opacity-50">Previous</button><span className="text-sm text-slate-600 dark:text-slate-300">Page {pagination.page} of {pagination.totalPages}</span><button onClick={() => setPage((current) => current + 1)} disabled={!pagination.hasNextPage || loading} className="app-button-secondary disabled:opacity-50">Next</button></nav>}
    {selected && <div className="mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[.04]"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Status history · {selected._id}</h2><button onClick={() => setSelected(undefined)} className="text-sm font-bold text-slate-500">Close</button></div><Timeline issue={selected} /></div>}
    {editing && <EditIssueDialog issue={editing} onClose={() => setEditing(undefined)} onSaved={reportSaved} />}
  </div>;
}

function EditIssueDialog({ issue, onClose, onSaved }: { issue: ApiIssue; onClose: () => void; onSaved: (issue: ApiIssue) => void }) {
  const [form, setForm] = useState<UpdateMyIssueRequest>({ title: issue.title, description: issue.description, category: issue.category, priority: issue.priority, location: issue.location, emergency: issue.emergency });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof UpdateMyIssueRequest>(key: K, value: UpdateMyIssueRequest[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      onSaved(await updateMyIssue(issue._id, form));
    } catch (requestError) {
      setError(updateErrorMessage(requestError, 'Unable to save this report. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Edit report">
    <form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4"><div><p className="app-section-label">Citizen report</p><h2 className="mt-2 text-xl font-bold">Edit report details</h2><p className="mt-1 text-xs text-slate-500">Status, department assignment, and authority updates cannot be changed here.</p></div><button type="button" onClick={onClose} className="text-sm font-bold text-slate-500">Close</button></div>
      <label className="app-label">Title<input required minLength={5} maxLength={160} value={form.title ?? ''} onChange={(event) => set('title', event.target.value)} className="app-input" /></label>
      <label className="app-label">Description<textarea required minLength={15} maxLength={5000} value={form.description ?? ''} onChange={(event) => set('description', event.target.value)} rows={4} className="app-input" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="app-label">Category<input required minLength={2} maxLength={80} value={form.category ?? ''} onChange={(event) => set('category', event.target.value)} className="app-input" /></label><label className="app-label">Priority<select value={form.priority} onChange={(event) => set('priority', event.target.value as IssuePriority)} className="app-input">{(['Low', 'Medium', 'High', 'Critical'] as IssuePriority[]).map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <label className="app-label">Location<input required minLength={2} maxLength={250} value={form.location ?? ''} onChange={(event) => set('location', event.target.value)} className="app-input" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.emergency ?? false} onChange={(event) => set('emergency', event.target.checked)} />Flag as urgent for staff</label><p className="text-xs text-slate-500">This highlights the report inside the app; it does not contact emergency services. Your account stays linked so you can follow it, and your name is omitted from staff report views.</p>
      {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
      <div className="flex gap-3"><button disabled={saving} className="app-button">{saving ? 'Saving...' : 'Save report'}</button><button type="button" onClick={onClose} className="app-button-secondary">Cancel</button></div>
    </form>
  </div>;
}

export function NotificationsPage() {
  const [items, setItems] = useState<ApiIssueUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyIssueUpdates().then((updates) => { if (active) { setItems(updates); setError(''); } })
      .catch(() => { if (active) setError('Unable to load report updates. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  return <div className="p-5 sm:p-8 lg:p-10"><p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-600">Stay informed</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Notifications</h1>
    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm text-slate-500">Staff updates saved with your reports in JAN Voice AI.</p><button onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} className="text-sm font-bold text-cyan-700 underline disabled:opacity-50">Refresh</button></div>
    {loading && <p role="status" className="mt-5 text-sm text-slate-500">Loading report updates...</p>}
    {error && <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => setRefreshKey((key) => key + 1)} className="font-bold underline">Retry</button></div>}
    <div className="mt-8 max-w-3xl space-y-3">{!loading && !error && items.length ? items.map((item) => <article key={item._id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-400/10"><Icon name="check" /></span><div><p className="text-xs font-semibold text-slate-500">{item.issueTitle ?? 'Report update'} · {item.status}</p><p className="mt-1 text-sm font-semibold">{item.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p></div></article>) : null}{!loading && !error && items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-white/15">No report updates yet. Staff updates recorded in JAN Voice AI will appear here.</div>}</div>
  </div>;
}

export function CitizenPlaceholder({ title }: { title: string }) { return <div className="p-5 sm:p-8 lg:p-10"><p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-600">Citizen account</p><h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1><div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900"><p>{title} management is planned and is not available in this prototype. Your current account details are used for sign-in and report ownership.</p><Link to="/dashboard/citizen" className="mt-4 inline-block font-bold underline">Return to dashboard</Link></div></div>; }
