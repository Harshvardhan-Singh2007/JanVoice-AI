import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { deleteIssue, getIssue, type ApiIssue, type UpdateIssueRequest, updateIssue } from '../../features/issues/issueApi';

type Status = 'Pending' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected';

export function IssueDetailsModal({ issueId, onClose, onSaved }: { issueId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [issue, setIssue] = useState<ApiIssue>();
  const [status, setStatus] = useState<Status>('Pending');
  const [department, setDepartment] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getIssue(issueId)
      .then((result) => {
        if (!active) return;
        setIssue(result);
        setStatus(result.status as Status);
        setDepartment(result.assignedDepartment ?? '');
        setRemarks(result.remarks ?? '');
      })
      .catch(() => {
        if (active) setError('Unable to load issue details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [issueId]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!issue) return;
    if ((status !== issue.status || (isAdmin && department !== (issue.assignedDepartment ?? '')))
      && !window.confirm('Save these complaint workflow changes?')) return;
    const changes: UpdateIssueRequest = {
      ...(status !== issue.status && status !== 'Pending' ? { status } : {}),
      ...(isAdmin && department !== (issue.assignedDepartment ?? '') ? { assignedDepartment: department } : {}),
      ...(remarks !== (issue.remarks ?? '') ? { remarks } : {}),
    };
    if (Object.keys(changes).length === 0) {
      setMessage('No changes to save.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateIssue(issueId, changes);
      setIssue(updated);
      setStatus(updated.status as Status);
      setDepartment(updated.assignedDepartment ?? '');
      setRemarks(updated.remarks ?? '');
      await onSaved();
      setMessage('Issue updated successfully.');
    } catch {
      setError('Unable to save issue changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this issue permanently?')) return;
    setSaving(true);
    setError('');
    try {
      await deleteIssue(issueId);
      await onSaved();
      onClose();
    } catch {
      setError('Unable to delete this issue. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Issue details">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="app-section-label">Issue management</p>
            <h2 className="mt-2 text-2xl font-bold">Issue details</h2>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100">Close</button>
        </div>
        {loading && <p className="mt-8 text-sm text-slate-500">Loading issue details...</p>}
        {error && <p className="mt-5 text-sm font-semibold text-rose-600">{error}</p>}
        {message && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p>}
        {issue && (
          <form onSubmit={save} className="mt-6 space-y-5">
            <section className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-bold">{issue.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{issue.description}</p>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-slate-500">Category:</span> {issue.category}</p>
                <p><span className="text-slate-500">Priority:</span> {issue.priority}</p>
                <p><span className="text-slate-500">Urgency:</span> {issue.emergency ? 'Citizen flagged this report as urgent' : 'No urgent flag'}</p>
                <p><span className="text-slate-500">Location:</span> {issue.location}</p>
                <p><span className="text-slate-500">Reported:</span> {new Date(issue.createdAt).toLocaleString()}</p>
              </div>
              {issue.image && <img src={issue.image} alt="Citizen submitted evidence" className="mt-4 max-h-64 rounded-xl object-contain" />}
              {issue.coordinates && <p className="mt-3 text-xs text-slate-500">Shared GPS: {issue.coordinates.latitude.toFixed(4)}, {issue.coordinates.longitude.toFixed(4)}</p>}
            </section>
            <label className="app-label">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value as Status)} className="app-input">
                <option value={status}>{status}</option>
                {(status === 'Pending' ? ['Assigned', 'In Progress', 'Rejected'] : status === 'Assigned' ? ['In Progress', 'Rejected'] : status === 'In Progress' ? ['Resolved', 'Rejected'] : []).map((next) => <option key={next}>{next}</option>)}
              </select>
            </label>
            {isAdmin && <label className="app-label">Assigned Department<input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Water Supply Board" className="app-input" /><span className="text-xs font-normal text-slate-500">Assigning a department moves a pending report to Assigned.</span></label>}
            <label className="app-label">
              Official remarks / resolution details
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} placeholder="Share official progress, follow-up actions, or resolution details." className="app-input min-h-[120px] resize-y" />
            </label>
            {issue.aiAnalysis && <section className="rounded-xl border border-violet-100 bg-violet-50 p-4"><h3 className="font-bold text-violet-950">AI recommendation (citizen reviewed)</h3><p className="mt-2 text-sm"><strong>{issue.aiAnalysis.category}</strong> · {issue.aiAnalysis.department} · suggested {issue.aiAnalysis.priority} priority</p><p className="mt-2 text-sm text-slate-700">{issue.aiAnalysis.reviewedSummary ?? issue.aiAnalysis.summary}</p><p className="mt-2 text-xs text-slate-500">{issue.aiAnalysis.explanation}</p></section>}
            {issue.updates?.length ? <section><h3 className="font-bold">Update history</h3><ol className="mt-3 space-y-3">{[...issue.updates].reverse().map((entry) => <li key={entry._id} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-semibold">{entry.message}</p><p className="mt-1 text-xs text-slate-500">{typeof entry.actor === 'object' ? `${entry.actor.fullName} · ${entry.actor.role}` : 'Staff update'} · {new Date(entry.createdAt).toLocaleString()}</p></li>)}</ol></section> : null}
            <div className="flex flex-wrap gap-3">
              <button disabled={saving} type="submit" className="app-button">{saving ? 'Saving...' : 'Save changes'}</button>
              {isAdmin && <button type="button" onClick={remove} disabled={saving} className="app-button-secondary border-rose-200 text-rose-600 hover:border-rose-300 hover:text-rose-700">Delete issue</button>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
