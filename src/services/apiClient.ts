import { ErrorResponse } from '../types';
import { platformStorage } from '../utils/platformStorage';

// Base API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic API client with proper error handling for React Native
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Remove the async loadToken call from constructor since constructors should be synchronous
  }

  private async loadToken(): Promise<void> {
    try {
      this.token = await platformStorage.getItem('authToken');
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  private async saveToken(token: string): Promise<void> {
    try {
      await platformStorage.setItem('authToken', token);
      this.token = token;
    } catch (error) {
      console.error('Failed to save auth token:', error);
    }
  }

  private async removeToken(): Promise<void> {
    try {
      await platformStorage.removeItem('authToken');
      this.token = null;
    } catch (error) {
      console.error('Failed to remove auth token:', error);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errors: string[] = [];

      try {
        const errorData: ErrorResponse = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.details && Array.isArray(errorData.details)) {
          errors = errorData.details;
        }
      } catch (parseError) {
        errors = [response.statusText];
      }

      throw new ApiError(errorMessage, response.status, errors);
    }

    try {
      const data = await response.json();
      return data;
    } catch (error) {
      throw new ApiError('Invalid JSON response', 500, [
        'Server returned invalid JSON',
      ]);
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    if (!this.token) {
      await this.loadToken();
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    console.log(`API POST request to: ${this.baseUrl}${endpoint}`, data);

    if (!this.token) {
      await this.loadToken();
    }

    const url = `${this.baseUrl}${endpoint}`;
    try {
      console.log(`Making fetch request to: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      console.log(`Response status: ${response.status} for ${url}`);
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`Fetch error for ${url}:`, error);
      throw error;
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    if (!this.token) {
      await this.loadToken();
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    if (!this.token) {
      await this.loadToken();
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    if (!this.token) {
      await this.loadToken();
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  // Auth token management
  async setAuthToken(token: string): Promise<void> {
    await this.saveToken(token);
  }

  async clearAuthToken(): Promise<void> {
    await this.removeToken();
  }

  async getAuthToken(): Promise<string | null> {
    if (!this.token) {
      await this.loadToken();
    }
    return this.token;
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    if (!this.token) {
      await this.loadToken();
    }
    return !!this.token;
  }

  // Synchronous methods for compatibility with AuthService
  setToken(token: string): void {
    this.token = token;
    // Also save to storage asynchronously
    this.saveToken(token).catch(error => {
      console.error('Failed to save token:', error);
    });
  }

  clearToken(): void {
    this.token = null;
    // Also clear from storage asynchronously
    this.removeToken().catch(error => {
      console.error('Failed to clear token:', error);
    });
  }

  getToken(): string | null {
    return this.token;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
