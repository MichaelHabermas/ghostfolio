export interface AgentSource {
  field: string;
  tool: string;
}

export interface AgentResponse {
  flags: string[];
  response: string;
  sessionId: string;
  sources: AgentSource[];
}
