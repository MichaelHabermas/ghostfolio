export interface AgentSource {
  tool: string;
  field: string;
}

export interface AgentResponse {
  flags: string[];
  response: string;
  sessionId: string;
  sources: AgentSource[];
  toolsCalled: string[];
}
