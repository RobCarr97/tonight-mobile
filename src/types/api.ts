// API Response Types (matches OpenAPI ApiResponse schema)
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message: string;
}

// Error Response (matches OpenAPI ErrorResponse schema)
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  details?: string[];
}

// Validation Error
export interface ValidationError {
  field: string;
  message: string;
}

// Health Check Response
export interface HealthResponse {
  status: string;
  timestamp: string;
  environment?: string;
  services?: {
    database?: string;
  };
}
