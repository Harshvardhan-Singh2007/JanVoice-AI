import type { ApiIssue } from '../../features/issues/issueApi';

export function Timeline({ issue }: { issue: ApiIssue }) {
  const updates = [...(issue.updates ?? [])].sort((left, right) => +new Date(left.createdAt) - +new Date(right.createdAt));
  return <ol className="mt-5 space-y-4">{(updates.length ? updates : [{ _id: issue._id, kind: 'submitted' as const, message: 'Report submitted.', createdAt: issue.createdAt }]).map((update) => <li key={update._id} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-500 text-xs font-bold text-slate-950">✓</span><div><p className="text-sm font-semibold">{update.message}</p><p className="text-xs text-slate-500">{new Date(update.createdAt).toLocaleString()}</p></div></li>)}</ol>;
}
