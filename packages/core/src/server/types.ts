export interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
  error?: string;
}
