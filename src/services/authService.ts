import {
  AuthResponseData,
  CompleteProfileData,
  CompleteProfileRequest,
  CreateUserRequest,
  GoogleAuthRequest,
  LoginRequest,
  UserResponse,
} from '../types';
import { apiClient, ApiError } from './apiClient';

class AuthService {
  // Email/password login (matches /auth/login endpoint)
  async login(loginData: LoginRequest): Promise<AuthResponseData> {
    try {
      console.log('Attempting login with:', loginData);

      const response = await apiClient.post<AuthResponseData>(
        '/auth/login',
        loginData
      );

      console.log('Auth service received response:', response);

      // Backend returns data in format: { data: { user: {...} }, message, success }
      // We need to extract the user and transform to expected format
      const backendResponse = response as any;
      if (backendResponse.data && backendResponse.data.user) {
        const authResponse: AuthResponseData = {
          user: backendResponse.data.user,
          profileComplete: true, // Assuming profile is complete if login succeeds
          token: backendResponse.token || 'temp-token', // Backend might not return token in login
        };

        console.log('Transformed auth response:', authResponse);

        // If the response includes a token, store it
        if (authResponse.token) {
          apiClient.setToken(authResponse.token);
        }

        return authResponse;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Login failed', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Google OAuth login (matches /auth/google endpoint)
  async googleLogin(credential: string): Promise<AuthResponseData> {
    try {
      const googleAuthRequest: GoogleAuthRequest = { token: credential };
      const response = await apiClient.post<AuthResponseData>(
        '/auth/google',
        googleAuthRequest
      );

      // If the response includes a token, store it
      if (response.token) {
        apiClient.setToken(response.token);
      }

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Google login failed', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Complete user profile (matches POST /users endpoint)
  async completeProfile(
    profileData: CompleteProfileRequest
  ): Promise<UserResponse> {
    try {
      const createUserRequest: CreateUserRequest = {
        username: profileData.username,
        email: profileData.email,
        password: profileData.password,
        dob: profileData.dob,
        gender: profileData.gender,
        orientation: profileData.orientation,
        showGender: profileData.showGender,
        showOrientation: profileData.showOrientation,
        promptAnswers: profileData.promptAnswers,
      };

      const response = await apiClient.post<any>('/users', createUserRequest);

      // Backend returns data in format: { data: { user data }, message, success }
      // Extract just the user data
      if (response.data) {
        return response.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Profile completion failed', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Complete existing user profile (matches /users/{id}/complete-profile endpoint)
  async completeUserProfile(
    userId: string,
    profileData: CompleteProfileData
  ): Promise<UserResponse> {
    try {
      const response = await apiClient.post<UserResponse>(
        `/users/${userId}/complete-profile`,
        profileData
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Profile completion failed', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Logout (note: /auth/logout not in OpenAPI spec, but keeping for compatibility)
  async logout(): Promise<void> {
    try {
      // Note: /auth/logout endpoint not in OpenAPI spec
      // await apiClient.post<void>('/auth/logout');
      apiClient.clearToken();

      // Google sign out temporarily disabled
      // await googleAuthService.signOut();
    } catch (error) {
      // Clear token even if logout request fails
      apiClient.clearToken();
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Logout failed', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get current user (placeholder - not in OpenAPI spec)
  async getCurrentUser(): Promise<AuthResponseData> {
    try {
      // Note: This endpoint pattern is not in the OpenAPI spec
      // You may need to implement a /auth/me endpoint or use a different approach
      // For now, this is a placeholder implementation

      // Placeholder: assume user is authenticated if token exists
      const token = apiClient.getToken();
      if (!token) {
        throw new ApiError('Not authenticated', 401, [
          'No authentication token',
        ]);
      }

      // This is a mock response - you'll need to implement proper user retrieval
      return {
        user: {
          id: 'placeholder-id',
          username: 'placeholder',
          email: 'placeholder@example.com',
        },
        profileComplete: true,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Clear invalid token
        apiClient.clearToken();
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get current user', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return apiClient.getToken() !== null;
  }

  // Set authentication token
  setToken(token: string): void {
    apiClient.setToken(token);
  }

  // Clear authentication token
  clearToken(): void {
    apiClient.clearToken();
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
