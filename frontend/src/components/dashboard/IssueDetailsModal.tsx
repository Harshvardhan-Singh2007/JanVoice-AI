import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { deleteIssue, getIssue, type ApiIssue, updateIssue } from '../../features/issues/issueApi';

type Status = 'Pending' | 'In Progress' | 'Resolved';

export function IssueDetailsModal({ issueId, onClose, onSaved }: { issueId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const { user } = useAuth();
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
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateIssue(issueId, { status, assignedDepartment: department, remarks });
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
                <p><span className="text-slate-500">Location:</span> {issue.location}</p>
                <p><span className="text-slate-500">Reported:</span> {new Date(issue.createdAt).toLocaleString()}</p>
              </div>
            </section>
            <label className="app-label">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value as Status)} className="app-input">
                <option>Pending</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </label>
            <label className="app-label">
              Assigned Department
              <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Water Supply Board" className="app-input" />
            </label>
            <label className="app-label">
              Remarks
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} placeholder="Share context, follow-up actions, or next steps." className="app-input min-h-[120px] resize-y" />
            </label>
            <div className="flex flex-wrap gap-3">
              <button disabled={saving} type="submit" className="app-button">{saving ? 'Saving...' : 'Save changes'}</button>
              <button type="button" onClick={remove} disabled={saving} className="app-button-secondary border-rose-200 text-rose-600 hover:border-rose-300 hover:text-rose-700">
                Delete issue
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
