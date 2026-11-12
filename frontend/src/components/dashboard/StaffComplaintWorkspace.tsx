import { useCallback, useEffect, useState } from 'react';
import { IssueDetailsModal } from './IssueDetailsModal';
import { IssueMap } from '../citizen/IssueMap';
import { useAuth } from '../../features/auth/useAuth';
import { getAllIssues, getAuthorityDashboard, getIssueMapMarkers, updateIssue, type ApiIssue, type AuthorityDashboardData, type IssueMapMarker, type IssuePagination } from '../../features/issues/issueApi';
import type { IssueStatus } from '../../types/issue';
import { getAuthorityAccounts, setAuthorityDepartment, type AuthorityAccount } from '../../features/admin/adminApi';

const statuses = ['All', 'Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'] as const;
const priorities = ['All', 'Critical', 'High', 'Medium', 'Low'] as const;

export function StaffComplaintWorkspace() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [dashboard, setDashboard] = useState<AuthorityDashboardData>();
  const [markers, setMarkers] = useState<IssueMapMarker[]>([]);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<(typeof statuses)[number]>('All');
  const [priority, setPriority] = useState<(typeof priorities)[number]>('All');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<IssuePagination>();
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorityAccounts, setAuthorityAccounts] = useState<AuthorityAccount[]>([]);
  const [scopeUserId, setScopeUserId] = useState('');
  const [scopeDepartment, setScopeDepartment] = useState('');
  const [scopeMessage, setScopeMessage] = useState('');
  const [scopeSaving, setScopeSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllIssues(page, 20, {
        ...(status !== 'All' ? { status } : {}),
        ...(priority !== 'All' ? { priority } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(isAdmin && department.trim() ? { department: department.trim() } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
        sort,
      });
      setIssues(result.issues);
      setPagination(result.pagination);
      setError('');
    } catch {
      setError('Unable to load complaint management data. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [page, status, priority, category, department, searchQuery, sort, isAdmin]);

  const refreshDashboard = useCallback(async () => {
    try {
      setDashboard(await getAuthorityDashboard());
    } catch {
      setError('Unable to load dashboard statistics. Refresh to try again.');
    }
  }, []);

  const refreshMap = useCallback(async () => {
    try {
      setMarkers(await getIssueMapMarkers());
      setMapUnavailable(false);
    } catch {
      setMapUnavailable(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refreshDashboard();
    void refreshMap();
  }, [refreshDashboard, refreshMap]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isAdmin) return;
    getAuthorityAccounts().then((accounts) => {
      setAuthorityAccounts(accounts);
      setScopeUserId((current) => current || accounts[0]?.id || accounts[0]?._id || '');
    }).catch(() => setScopeMessage('Unable to load authority accounts for scope management.'));
  }, [isAdmin]);

  const saveAuthorityScope = async () => {
    if (!scopeUserId || scopeDepartment.trim().length < 2) return;
    setScopeSaving(true);
    setScopeMessage('');
    try {
      await setAuthorityDepartment(scopeUserId, scopeDepartment.trim());
      setScopeMessage("Department scope saved. The authority's next API request will use the updated scope.");
      const accounts = await getAuthorityAccounts();
      setAuthorityAccounts(accounts);
    } catch {
      setScopeMessage('Unable to save the authority department scope.');
    } finally {
      setScopeSaving(false);
    }
  };

  const changeStatus = async (issue: ApiIssue, next: IssueStatus) => {
    if (next === issue.status) return;
    if (!window.confirm(`Change â€œ${issue.title}â€ from ${issue.status} to ${next}?`)) return;
    try {
      await updateIssue(issue._id, { status: next as 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected' });
      await Promise.all([refresh(), refreshDashboard(), refreshMap()]);
      setError('');
    } catch {
      setError('That status change could not be saved. Check the current workflow state and try again.');
    }
  };

  const statCards = [
    ['Assigned total', dashboard?.total ?? 0],
    ['Pending', dashboard?.pending ?? 0],
    ['Assigned', dashboard?.assigned ?? 0],
    ['In progress', dashboard?.inProgress ?? 0],
    ['Resolved', dashboard?.resolved ?? 0],
    ['Rejected', dashboard?.rejected ?? 0],
  ] as const;

  return <div className="space-y-8">
    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600">Workflow updates are stored in JAN Voice AI only. This demo is not connected to external government systems.</p>
    {!isAdmin && dashboard && !dashboard.scopeConfigured && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">This authority account has no department scope yet. An administrator must assign a department before complaints are available.</div>}
    {isAdmin && <section id="authority-scopes" className="scroll-mt-24 rounded-2xl border border-indigo-100 bg-indigo-50 p-5"><h2 className="font-bold text-indigo-950">Authority department scopes</h2><p className="mt-1 text-sm text-indigo-800">Assign each existing authority account to its permitted department. No authority accounts are created here.</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><select aria-label="Authority account" value={scopeUserId} onChange={(event) => { const account = authorityAccounts.find((item) => (item.id ?? item._id) === event.target.value); setScopeUserId(event.target.value); setScopeDepartment(account?.department ?? ''); }} className="app-input"><option value="">Select authority account</option>{authorityAccounts.map((account) => <option key={account.id ?? account._id} value={account.id ?? account._id}>{account.fullName} · {account.email}{account.department ? ` · ${account.department}` : ''}</option>)}</select><input aria-label="Authority department scope" value={scopeDepartment} onChange={(event) => setScopeDepartment(event.target.value)} maxLength={120} placeholder="Department scope" className="app-input" /><button onClick={() => void saveAuthorityScope()} disabled={scopeSaving || !scopeUserId || scopeDepartment.trim().length < 2} className="app-button disabled:opacity-50">{scopeSaving ? 'Saving...' : 'Save scope'}</button></div>{!authorityAccounts.length && <p className="mt-3 text-sm text-indigo-800">No existing authority accounts are available.</p>}{scopeMessage && <p role="status" className="mt-3 text-sm text-indigo-900">{scopeMessage}</p>}</section>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button onClick={() => void refresh()} className="font-bold underline">Retry</button></div>}
    <section aria-label="Complaint statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {statCards.map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{loading ? '-' : value}</p></article>)}
    </section>
    <section className="grid gap-5 xl:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2"><h2 className="font-bold">Recent complaint activity</h2>{loading ? <p className="mt-4 text-sm text-slate-500">Loading activity...</p> : dashboard?.recentActivity.length ? <ul className="mt-4 divide-y divide-slate-100">{dashboard.recentActivity.map((entry) => <li key={`${entry.issueId}-${entry.updatedAt}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><button onClick={() => setSelectedIssueId(entry.issueId)} className="text-left"><span className="font-semibold">{entry.title}</span><span className="ml-2 text-xs text-slate-500">{entry.category}</span><span className="mt-1 block text-sm text-slate-600">{entry.message}</span></button><span className="text-xs text-slate-500">{new Date(entry.updatedAt).toLocaleString()}</span></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No complaint activity yet.</p>}</article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Department summary</h2>{loading ? <p className="mt-4 text-sm text-slate-500">Loading summary...</p> : dashboard?.departments.length ? <ul className="mt-4 space-y-3">{dashboard.departments.map((item) => <li key={item.department} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.department}</span><strong>{item.count}</strong></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No assigned departments in this scope.</p>}</article>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Complaint queue</h2><p className="mt-1 text-sm text-slate-500">Search, filter and update complaints in your authorized scope.</p></div><button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50">Refresh</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search complaints" aria-label="Search complaints" className="app-input" />
        <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as (typeof statuses)[number]); setPage(1); }} className="app-input">{statuses.map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter by priority" value={priority} onChange={(event) => { setPriority(event.target.value as (typeof priorities)[number]); setPage(1); }} className="app-input">{priorities.map((value) => <option key={value}>{value}</option>)}</select>
        <input aria-label="Filter by category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} maxLength={80} placeholder="Category" className="app-input" />
        {isAdmin && <input aria-label="Filter by department" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} maxLength={120} placeholder="Department" className="app-input" />}
        <select aria-label="Sort complaints" value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }} className="app-input"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="priority">Priority</option></select>
      </div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Complaint</th><th className="px-4 py-3">Category / department</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Workflow</th></tr></thead><tbody>{issues.map((issue) => <tr key={issue._id} className="border-t border-slate-100"><td className="px-4 py-4"><button onClick={() => setSelectedIssueId(issue._id)} className="text-left"><span className="font-bold hover:text-blue-700">{issue.title}</span>{issue.emergency && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Urgent flag</span>}<span className="mt-1 block max-w-sm truncate text-xs text-slate-500">{issue.location}</span></button></td><td className="px-4 py-4">{issue.category}<span className="mt-1 block text-xs text-slate-500">{issue.assignedDepartment ?? 'Unassigned'}</span></td><td className="px-4 py-4">{issue.priority}</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{issue.status}</span></td><td className="px-4 py-4"><div className="flex gap-2"><select aria-label={`Update status for ${issue.title}`} value={issue.status} onChange={(event) => void changeStatus(issue, event.target.value as IssueStatus)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value={issue.status}>{issue.status}</option>{(issue.status === 'Pending' ? ['In Progress', 'Rejected'] : issue.status === 'Assigned' ? ['In Progress', 'Rejected'] : issue.status === 'In Progress' ? ['Resolved', 'Rejected'] : []).map((value) => <option key={value}>{value}</option>)}</select><button onClick={() => setSelectedIssueId(issue._id)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">Details</button></div></td></tr>)}{!loading && issues.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No complaints match these filters.</td></tr>}{loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading complaints...</td></tr>}</tbody></table></div>
      {pagination && (pagination.totalPages > 1 || pagination.page > 1) && <nav aria-label="Complaint pages" className="mt-5 flex items-center justify-center gap-4"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={!pagination.hasPreviousPage || loading} className="app-button-secondary disabled:opacity-50">Previous</button><span className="text-sm text-slate-600">Page {pagination.page} of {pagination.totalPages} · {pagination.total} complaints</span><button onClick={() => setPage((current) => current + 1)} disabled={!pagination.hasNextPage || loading} className="app-button-secondary disabled:opacity-50">Next</button></nav>}
    </section>
    <IssueMap markers={markers} unavailable={mapUnavailable} />
    {selectedIssueId && <IssueDetailsModal issueId={selectedIssueId} onClose={() => setSelectedIssueId('')} onSaved={async () => { await Promise.all([refresh(), refreshDashboard(), refreshMap()]); }} />}
  </div>;
}
