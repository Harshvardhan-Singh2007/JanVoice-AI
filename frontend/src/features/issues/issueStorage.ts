import type { AppNotification, Issue } from '../../types/issue';

const reportsKey = 'janvoice_ai_reports';
const notificationsKey = 'janvoice_ai_notifications';

const safelyRead = <T,>(key: string): T[] => { try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]; } catch { return []; } };

export const issueStorage = {
  reports: () => safelyRead<Issue>(reportsKey),
  saveReport: (issue: Issue) => localStorage.setItem(reportsKey, JSON.stringify([issue, ...safelyRead<Issue>(reportsKey)])),
  updateReport: (issue: Issue) => localStorage.setItem(reportsKey, JSON.stringify(safelyRead<Issue>(reportsKey).map((item) => item.id === issue.id ? issue : item))),
  deleteReport: (id: string) => localStorage.setItem(reportsKey, JSON.stringify(safelyRead<Issue>(reportsKey).filter((item) => item.id !== id))),
  notifications: () => safelyRead<AppNotification>(notificationsKey),
  addNotification: (message: string) => localStorage.setItem(notificationsKey, JSON.stringify([{ id: crypto.randomUUID(), message, date: new Date().toISOString(), read: false }, ...safelyRead<AppNotification>(notificationsKey)])),
};
