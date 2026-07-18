import { apiClient } from '../../lib/api/client';
import type { IssuePriority, IssueStatus } from '../../types/issue';

export interface CreateIssueRequest {
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  location: string;
  anonymous: boolean;
  emergency: boolean;
  image?: File;
}

export interface ApiIssue {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  location: string;
  anonymous: boolean;
  emergency: boolean;
  image?: string;
  status: IssueStatus;
  assignedDepartment?: string;
  remarks?: string;
  createdAt: string;
}

export async function createIssue(input: CreateIssueRequest): Promise<ApiIssue> {
  const formData = new FormData();
  formData.append('title', input.title);
  formData.append('description', input.description);
  formData.append('category', input.category);
  formData.append('priority', input.priority);
  formData.append('location', input.location);
  formData.append('anonymous', String(input.anonymous));
  formData.append('emergency', String(input.emergency));
  if (input.image) formData.append('image', input.image);

  const { data } = await apiClient.post<{ status: string; data: { issue: ApiIssue } }>('/api/issues', formData);
  return data.data.issue;
}

export async function getMyIssues(): Promise<ApiIssue[]> {
  const { data } = await apiClient.get<{ status: string; data: { issues: ApiIssue[] } }>('/api/issues/mine');
  return data.data.issues;
}

export async function getAllIssues(): Promise<ApiIssue[]> {
  const { data } = await apiClient.get<{ status: string; data: { issues: ApiIssue[] } }>('/api/issues');
  return data.data.issues;
}

export async function updateIssueStatus(issueId: string, status: 'Pending' | 'In Progress' | 'Resolved'): Promise<ApiIssue> {
  const { data } = await apiClient.patch<{ status: string; data: { issue: ApiIssue } }>(`/api/issues/${issueId}/status`, { status });
  return data.data.issue;
}

export interface UpdateIssueRequest {
  status?: 'Pending' | 'In Progress' | 'Resolved';
  assignedDepartment?: string;
  remarks?: string;
}

export async function getIssue(issueId: string): Promise<ApiIssue> {
  const { data } = await apiClient.get<{ status: string; data: { issue: ApiIssue } }>(`/api/issues/${issueId}`);
  return data.data.issue;
}

export async function updateIssue(issueId: string, input: UpdateIssueRequest): Promise<ApiIssue> {
  const { data } = await apiClient.patch<{ status: string; data: { issue: ApiIssue } }>(`/api/issues/${issueId}`, input);
  return data.data.issue;
}

export async function deleteIssue(issueId: string): Promise<void> {
  await apiClient.delete(`/api/issues/${issueId}`);
}
