import { apiClient } from '../../lib/api/client';

export type AiComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AiComplaintAnalysis {
  category: string;
  department: string;
  priority: AiComplaintPriority;
  professionalVersion: string;
  language: string;
}

export async function analyzeComplaint(text: string): Promise<AiComplaintAnalysis> {
  const { data } = await apiClient.post<{ success: true; data: AiComplaintAnalysis }>('/api/ai/analyze', { text });
  return data.data;
}
