export interface ApiResponse<T = any> {
  status: number;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
  errors?: Map<string, string>;
}
