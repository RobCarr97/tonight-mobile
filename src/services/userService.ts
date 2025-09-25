import { PromptCategory } from '../constants/promptCategories';
import {
  UpdateProfileRequest,
  UserFilterRequest,
  UserResponse,
  UserSearchResult,
} from '../types';
import { apiClient, ApiError } from './apiClient';

class UserService {
  // Get prompt categories from backend
  async getPromptCategories(): Promise<PromptCategory[]> {
    try {
      const response = await apiClient.get<PromptCategory[]>(
        '/prompts/categories'
      );
      return response;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get prompt categories', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get user by ID (matches OpenAPI /users/{id} endpoint)
  async getUserById(userId: string): Promise<UserResponse> {
    try {
      if (!userId || userId === 'undefined') {
        throw new ApiError('User ID is required', 400, ['Invalid user ID']);
      }
      const response = await apiClient.get<UserResponse>(`/users/${userId}`);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get user', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Update user profile (matches OpenAPI PUT /users/{id}/profile endpoint)
  async updateProfile(
    userId: string,
    userData: UpdateProfileRequest
  ): Promise<UserResponse> {
    try {
      if (!userId || userId === 'undefined') {
        throw new ApiError('User ID is required for profile update', 400, [
          'Invalid user ID',
        ]);
      }

      const response = await apiClient.put<UserResponse>(
        `/users/${userId}/profile`,
        userData
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to update profile', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Search users with filters
  async searchUsers(filters: UserFilterRequest): Promise<UserSearchResult[]> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      if (filters.venueId) {
        queryParams.append('venueId', filters.venueId);
      }

      if (filters.userLocation) {
        queryParams.append('lat', filters.userLocation.lat.toString());
        queryParams.append('lng', filters.userLocation.lng.toString());
      }

      if (filters.maxDistance) {
        queryParams.append('maxDistance', filters.maxDistance.toString());
      }

      if (filters.minAge) {
        queryParams.append('minAge', filters.minAge.toString());
      }

      if (filters.maxAge) {
        queryParams.append('maxAge', filters.maxAge.toString());
      }

      if (filters.genders && filters.genders.length > 0) {
        filters.genders.forEach(gender =>
          queryParams.append('genders', gender)
        );
      }

      if (filters.orientations && filters.orientations.length > 0) {
        filters.orientations.forEach(orientation =>
          queryParams.append('orientations', orientation)
        );
      }

      if (filters.venueTypes && filters.venueTypes.length > 0) {
        filters.venueTypes.forEach(type =>
          queryParams.append('venueTypes', type)
        );
      }

      const endpoint = `/users/search${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;
      const response = await apiClient.get<UserSearchResult[]>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to search users', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Delete user account (matches OpenAPI DELETE /users/{id} endpoint)
  async deleteUser(userId: string): Promise<void> {
    try {
      if (!userId || userId === 'undefined') {
        throw new ApiError('User ID is required for account deletion', 400, [
          'Invalid user ID',
        ]);
      }

      await apiClient.delete(`/users/${userId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to delete user account', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;
