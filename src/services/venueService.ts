import { Bar, CoffeeShop, Restaurant, Venue } from '../types';
import { apiClient, ApiError } from './apiClient';

class VenueService {
  // Get bars with flexible search including venue type filter
  async getBars(params: {
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    venueTypes?: string[];
    eventDate?: string; // Date filtering for venue availability/events
  }): Promise<Bar[]> {
    try {
      let lat = params.lat;
      let lng = params.lng;
      let radius = params.radius || 5000; // Default 5km radius

      // If city is provided but no coordinates, get city coordinates
      if (params.city && (!lat || !lng)) {
        const cityData = await this.getCityCoordinates(params.city);
        if (cityData) {
          lat = cityData.lat;
          lng = cityData.lng;
          radius = cityData.radius;
        }
      }

      // Ensure we have coordinates
      if (!lat || !lng) {
        return [];
      }

      const queryParams = new URLSearchParams();
      queryParams.append('lat', lat.toString());
      queryParams.append('lng', lng.toString());
      queryParams.append('radius', radius.toString());

      // Add venue type filters if specified
      if (params.venueTypes && params.venueTypes.length > 0) {
        params.venueTypes.forEach(type => {
          queryParams.append('venueTypes', type);
        });
      } else {
        // Default to all venue types when none specified
        ['bar', 'restaurant', 'coffee-shop'].forEach(type => {
          queryParams.append('venueTypes', type);
        });
      }

      // Add event date filter if specified
      if (params.eventDate) {
        queryParams.append('eventDate', params.eventDate);
      }

      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : '';

      // Use single venues/search endpoint with type filtering
      const endpoint = `/venues/search${queryString}`;
      console.log('Fetching venues from endpoint:', endpoint);
      const venues = await this.fetchVenuesFromEndpoint(endpoint);
      console.log('Venues service returned:', venues.length, 'venues');
      return venues;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get venues', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Helper method to fetch venues from a specific endpoint
  private async fetchVenuesFromEndpoint(endpoint: string): Promise<Bar[]> {
    try {
      console.log('API call to:', endpoint);
      const response = await apiClient.get<any>(endpoint);
      console.log('API response:', response);

      // Handle different response formats:
      // /venues/search returns: { venues: [...], searchCenter, radiusMeters, venueTypes, totalResults }
      // Other endpoints return: { data: [...venues...], success: true, message: "..." }
      const venues =
        response.venues && Array.isArray(response.venues)
          ? response.venues
          : response.data && Array.isArray(response.data)
          ? response.data
          : [];

      console.log('Parsed venues from response:', venues.length);
      return venues;
    } catch (error) {
      // Log error but don't throw to allow other endpoints to succeed
      console.warn(`Failed to fetch from ${endpoint}:`, error);
      return [];
    }
  }

  // Get restaurants with flexible search (city name or coordinates)
  async getRestaurants(params: {
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }): Promise<Restaurant[]> {
    try {
      const queryParams = new URLSearchParams();

      if (params.city) {
        queryParams.append('city', params.city);
      } else if (params.lat && params.lng) {
        queryParams.append('lat', params.lat.toString());
        queryParams.append('lng', params.lng.toString());
        if (params.radius) {
          queryParams.append('radius', params.radius.toString());
        }
      }

      const endpoint = `/restaurants${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;
      return await apiClient.get<Restaurant[]>(endpoint);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get restaurants', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get coffee shops with flexible search (city name or coordinates)
  async getCoffeeShops(params: {
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }): Promise<CoffeeShop[]> {
    try {
      const queryParams = new URLSearchParams();

      if (params.city) {
        queryParams.append('city', params.city);
      } else if (params.lat && params.lng) {
        queryParams.append('lat', params.lat.toString());
        queryParams.append('lng', params.lng.toString());
        if (params.radius) {
          queryParams.append('radius', params.radius.toString());
        }
      }

      const endpoint = `/coffee-shops${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;
      return await apiClient.get<CoffeeShop[]>(endpoint);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get coffee shops', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Search all venues by location (matches /venues/search endpoint)
  async searchVenues(params: {
    lat: number;
    lng: number;
    radius?: number;
    venueTypes?: ('bar' | 'restaurant' | 'coffee-shop')[];
  }): Promise<Venue[]> {
    try {
      const queryParams = new URLSearchParams({
        lat: params.lat.toString(),
        lng: params.lng.toString(),
      });

      if (params.radius) {
        queryParams.append('radius', params.radius.toString());
      }

      if (params.venueTypes && params.venueTypes.length > 0) {
        params.venueTypes.forEach(type =>
          queryParams.append('venueTypes', type)
        );
      } else {
        // Default to all venue types when none specified
        ['bar', 'restaurant', 'coffee-shop'].forEach(type =>
          queryParams.append('venueTypes', type)
        );
      }

      const endpoint = `/venues/search?${queryParams.toString()}`;
      return await apiClient.get<Venue[]>(endpoint);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to search venues', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Search bars specifically (matches /venues/bars/search endpoint)
  async searchBars(params: {
    lat: number;
    lng: number;
    radius?: number;
    query?: string;
  }): Promise<Bar[]> {
    try {
      const queryParams = new URLSearchParams({
        lat: params.lat.toString(),
        lng: params.lng.toString(),
      });

      if (params.radius) {
        queryParams.append('radius', params.radius.toString());
      }

      if (params.query) {
        queryParams.append('query', params.query);
      }

      const endpoint = `/venues/bars/search?${queryParams.toString()}`;
      return await apiClient.get<Bar[]>(endpoint);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to search bars', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Search restaurants specifically (matches /venues/restaurants/search endpoint)
  async searchRestaurants(params: {
    lat: number;
    lng: number;
    radius?: number;
    query?: string;
  }): Promise<Restaurant[]> {
    try {
      const queryParams = new URLSearchParams({
        lat: params.lat.toString(),
        lng: params.lng.toString(),
      });

      if (params.radius) {
        queryParams.append('radius', params.radius.toString());
      }

      if (params.query) {
        queryParams.append('query', params.query);
      }

      const endpoint = `/venues/restaurants/search?${queryParams.toString()}`;
      return await apiClient.get<Restaurant[]>(endpoint);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to search restaurants', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Search coffee shops specifically (matches /venues/coffee-shops/search endpoint)
  async searchCoffeeShops(params: {
    lat: number;
    lng: number;
    radius?: number;
    query?: string;
  }): Promise<CoffeeShop[]> {
    try {
      const queryParams = new URLSearchParams({
        lat: params.lat.toString(),
        lng: params.lng.toString(),
      });

      if (params.radius) {
        queryParams.append('radius', params.radius.toString());
      }

      if (params.query) {
        queryParams.append('query', params.query);
      }

      const endpoint = `/venues/coffee-shops/search?${queryParams.toString()}`;
      return await apiClient.get<CoffeeShop[]>(endpoint);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to search coffee shops', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get all venues in a city (convenience method)
  async getVenuesInCity(city: string): Promise<{
    bars: Bar[];
    restaurants: Restaurant[];
    coffeeShops: CoffeeShop[];
  }> {
    try {
      const [bars, restaurants, coffeeShops] = await Promise.all([
        this.getBars({ city }),
        this.getRestaurants({ city }),
        this.getCoffeeShops({ city }),
      ]);

      return { bars, restaurants, coffeeShops };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get venues in city', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get available cities from the backend
  async getCities(): Promise<string[]> {
    try {
      const response = await apiClient.get<any>('/venues/cities');

      // Backend returns data in format: { data: [{key, name, lat, lng, radius}...], message, success }
      if (response.data && Array.isArray(response.data)) {
        // Extract city names from city objects
        return response.data.map((city: any) => city.name || city.key);
      }

      // Fallback to empty array if data format is unexpected
      return [];
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get cities', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get city coordinates from the backend
  async getCityCoordinates(
    cityName: string
  ): Promise<{ lat: number; lng: number; radius: number } | null> {
    try {
      const response = await apiClient.get<any>('/venues/cities');

      // Backend returns data in format: { data: [{key, name, lat, lng, radius}...], message, success }
      if (response.data && Array.isArray(response.data)) {
        // Find city by name (case insensitive)
        const city = response.data.find(
          (c: any) =>
            c.name?.toLowerCase() === cityName.toLowerCase() ||
            c.key?.toLowerCase() === cityName.toLowerCase()
        );

        if (city) {
          return {
            lat: city.lat,
            lng: city.lng,
            radius: city.radius || 5000,
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to get city coordinates:', error);
      return null;
    }
  }
}

// Export singleton instance
export const venueService = new VenueService();
export default venueService;
