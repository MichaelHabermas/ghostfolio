export interface AgentFeedbackRequest {
  sessionId: string;
  score: 'up' | 'down';
  comment?: string;
}
