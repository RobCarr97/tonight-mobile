// Venue Types
export type VenueType = 'bar' | 'restaurant' | 'coffee-shop';

// Base Venue Interface (common properties for all venue types)
interface BaseVenue {
  id: string;
  placeId?: string;
  name: string;
  address: string;
  city: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  lat: number;
  lng: number;
}

// Bar Interface (matches OpenAPI Bar schema)
export interface Bar extends BaseVenue {}

// Restaurant Interface (matches OpenAPI Restaurant schema)
export interface Restaurant extends BaseVenue {}

// Coffee Shop Interface (matches OpenAPI CoffeeShop schema)
export interface CoffeeShop extends BaseVenue {}

// Generic Venue Interface (union of all venue types)
export interface Venue extends BaseVenue {
  type?: VenueType;
}

// Venue Search Request
export interface VenueSearchRequest {
  // City-based search
  city?: string;
  // Coordinate-based search
  lat?: number;
  lng?: number;
  radius?: number; // meters (100-50000)
  // Filter options
  venueTypes?: VenueType[];
}

// Venue Detail Response (for specific venue requests)
export interface VenueDetail extends Venue {
  // Additional venue details could be added here if needed
  // e.g., hours, photos, reviews, etc.
}
