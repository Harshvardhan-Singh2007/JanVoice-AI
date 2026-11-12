import { apiClient } from '../../lib/api/client';

export interface DistributionItem { label: string; count: number; }
export interface AdminStatistics {
  totalUsers: number;
  totalIssues: number;
  pendingIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  categories: DistributionItem[];
  priorities: DistributionItem[];
  statuses: DistributionItem[];
}
export interface AdminActivity { _id: string; title: string; status: string; category: string; assignedDepartment?: string; updatedAt: string; createdAt: string; }
export interface AdminNotification { _id: string; title: string; status: string; priority: string; emergency?: boolean; updatedAt: string; createdAt: string; }
export interface AuthorityAccount { id: string; _id?: string; fullName: string; email: string; role: 'authority'; department?: string; }

export async function getAdminStatistics(): Promise<AdminStatistics> {
  const { data } = await apiClient.get<{ status: string; data: { statistics: AdminStatistics } }>('/api/admin/statistics');
  return data.data.statistics;
}

export async function getRecentActivity(): Promise<AdminActivity[]> {
  const { data } = await apiClient.get<{ status: string; data: { activity: AdminActivity[] } }>('/api/admin/recent-activity');
  return data.data.activity;
}

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const { data } = await apiClient.get<{ status: string; data: { notifications: AdminNotification[] } }>('/api/admin/notifications');
  return data.data.notifications;
}

export async function getAuthorityAccounts(): Promise<AuthorityAccount[]> {
  const { data } = await apiClient.get<{ status: string; data: { authorities: AuthorityAccount[] } }>('/api/admin/authorities');
  return data.data.authorities;
}

export async function setAuthorityDepartment(userId: string, department: string): Promise<void> {
  await apiClient.patch(`/api/admin/authorities/${userId}/department`, { department });
}
