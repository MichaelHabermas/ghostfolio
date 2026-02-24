export interface AgentSource {
  tool: string;
  field: string;
}

export interface AgentResponse {
  response: string;
  sources: AgentSource[];
  flags: string[];
  sessionId: string;
}
