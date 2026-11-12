import { apiClient } from '../../lib/api/client';

export type AiComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AiComplaintAnalysis {
  available: true;
  category: string;
  department: string;
  priority: AiComplaintPriority;
  summary: string;
  language: string;
  explanation: string;
  analyzedAt: string;
  model: string;
  analysisToken: string;
}

export interface AiAnalysisUnavailable {
  available: false;
  message: string;
}

export async function analyzeComplaint(text: string): Promise<AiComplaintAnalysis | AiAnalysisUnavailable> {
  const { data } = await apiClient.post<{ success: true; data: AiComplaintAnalysis | AiAnalysisUnavailable }>('/api/ai/analyze', { text });
  return data.data;
}
