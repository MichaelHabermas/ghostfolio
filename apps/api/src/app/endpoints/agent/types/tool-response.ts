export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
