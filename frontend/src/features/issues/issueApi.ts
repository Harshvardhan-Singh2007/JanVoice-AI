import { apiClient } from '../../lib/api/client';
import type { IssuePriority, IssueStatus } from '../../types/issue';

export interface CreateIssueRequest {
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  location: string;
  anonymous?: boolean;
  emergency: boolean;
  image?: File;
  coordinates?: { latitude: number; longitude: number };
  analysisToken?: string;
  aiReviewState?: 'accepted' | 'edited' | 'rejected';
  aiSummary?: string;
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
  coordinates?: { latitude: number; longitude: number };
  status: IssueStatus;
  assignedDepartment?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  updates?: ApiIssueUpdate[];
  aiAnalysis?: {
    category: string;
    department: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
    language: string;
    explanation: string;
    analyzedAt: string;
    model: string;
    reviewState: 'accepted' | 'edited' | 'rejected';
    reviewedSummary?: string;
  };
}

export interface ApiIssueUpdate {
  _id: string;
  issueId?: string;
  issueTitle?: string;
  kind: 'submitted' | 'status' | 'assignment' | 'remarks';
  message: string;
  status?: IssueStatus;
  createdAt: string;
  actor?: string | { _id: string; fullName: string; role: string };
}

export interface AuthorityDashboardData {
  scopeConfigured: boolean;
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  recentActivity: Array<{ issueId: string; title: string; category: string; status: IssueStatus; priority: IssuePriority; updatedAt: string; message: string; actor?: string }>;
  departments: Array<{ department: string; count: number }>;
}

export interface IssueListFilters {
  status?: IssueStatus;
  category?: string;
  priority?: IssuePriority;
  search?: string;
  sort?: 'newest' | 'oldest' | 'priority';
  department?: string;
}

export interface IssuePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedIssueResponse {
  issues: ApiIssue[];
  pagination: IssuePagination;
}

export function buildIssueListQuery(page: number, pageSize: number, filters: IssueListFilters = {}): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  for (const key of ['status', 'category', 'priority', 'search', 'sort', 'department'] as const) {
    const value = filters[key];
    const normalized = value?.trim();
    if (normalized) params.set(key, normalized);
  }
  return params.toString();
}

export interface MyIssueStatistics {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export interface IssueMapMarker {
  reference: string;
  category: string;
  status: IssueStatus;
  coordinates: { latitude: number; longitude: number };
  createdAt: string;
}

export interface PotentialDuplicate {
  reference: string;
  category: string;
  status: IssueStatus;
  createdAt: string;
  distanceMeters?: number;
}

export async function createIssue(input: CreateIssueRequest): Promise<ApiIssue> {
  const formData = new FormData();
  formData.append('title', input.title);
  formData.append('description', input.description);
  formData.append('category', input.category);
  formData.append('priority', input.priority);
  formData.append('location', input.location);
  if (input.anonymous !== undefined) formData.append('anonymous', String(input.anonymous));
  formData.append('emergency', String(input.emergency));
  if (input.analysisToken) formData.append('analysisToken', input.analysisToken);
  if (input.aiReviewState) formData.append('aiReviewState', input.aiReviewState);
  if (input.aiSummary) formData.append('aiSummary', input.aiSummary);
  if (input.image) formData.append('image', input.image);
  if (input.coordinates) {
    formData.append('latitude', String(input.coordinates.latitude));
    formData.append('longitude', String(input.coordinates.longitude));
  }

  const { data } = await apiClient.post<{ status: string; data: { issue: ApiIssue } }>('/api/issues', formData);
  return data.data.issue;
}

export async function getIssueMapMarkers(): Promise<IssueMapMarker[]> {
  const { data } = await apiClient.get<{ status: string; data: { markers: IssueMapMarker[] } }>('/api/issues/map');
  return data.data.markers;
}

export async function checkPotentialDuplicates(input: {
  title: string;
  description: string;
  category: string;
  coordinates?: { latitude: number; longitude: number };
}): Promise<PotentialDuplicate[]> {
  const { data } = await apiClient.post<{ status: string; data: { duplicates: PotentialDuplicate[] } }>('/api/issues/duplicates', input);
  return data.data.duplicates;
}

export async function getMyIssues(): Promise<ApiIssue[]> {
  const page = await getMyIssuesPage(1, 10);
  return page.issues;
}

export async function getMyIssuesPage(page = 1, pageSize = 10, filters: IssueListFilters = {}): Promise<PaginatedIssueResponse> {
  const { data } = await apiClient.get<{ status: string; data: PaginatedIssueResponse }>(`/api/issues/mine?${buildIssueListQuery(page, pageSize, filters)}`);
  return data.data;
}

export async function getMyIssueStatistics(): Promise<MyIssueStatistics> {
  const { data } = await apiClient.get<{ status: string; data: { statistics: MyIssueStatistics } }>('/api/issues/mine/stats');
  return data.data.statistics;
}

export async function getMyIssueUpdates(): Promise<ApiIssueUpdate[]> {
  const { data } = await apiClient.get<{ status: string; data: { updates: ApiIssueUpdate[] } }>('/api/issues/mine/updates');
  return data.data.updates;
}

export async function getAllIssues(page = 1, pageSize = 20, filters: IssueListFilters = {}): Promise<PaginatedIssueResponse> {
  const { data } = await apiClient.get<{ status: string; data: PaginatedIssueResponse }>(`/api/issues?${buildIssueListQuery(page, pageSize, filters)}`);
  return data.data;
}

export async function getAuthorityDashboard(): Promise<AuthorityDashboardData> {
  const { data } = await apiClient.get<{ status: string; data: { dashboard: AuthorityDashboardData } }>('/api/issues/dashboard');
  return data.data.dashboard;
}

export async function updateIssueStatus(issueId: string, status: 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected'): Promise<ApiIssue> {
  const { data } = await apiClient.patch<{ status: string; data: { issue: ApiIssue } }>(`/api/issues/${issueId}/status`, { status });
  return data.data.issue;
}

export interface UpdateIssueRequest {
  status?: 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected';
  assignedDepartment?: string;
  remarks?: string;
}

export interface UpdateMyIssueRequest {
  title?: string;
  description?: string;
  category?: string;
  priority?: IssuePriority;
  location?: string;
  anonymous?: boolean;
  emergency?: boolean;
}

export async function updateMyIssue(issueId: string, input: UpdateMyIssueRequest): Promise<ApiIssue> {
  const { data } = await apiClient.patch<{ status: string; data: { issue: ApiIssue } }>(`/api/issues/mine/${issueId}`, input);
  return data.data.issue;
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
