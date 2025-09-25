import { UserResponse } from './user';
import { Venue } from './venue';

// Date Event Status (matches OpenAPI schema)
export type DateEventStatus = 'open' | 'accepted' | 'rejected' | 'cancelled';

// Date Request Status (matches OpenAPI schema)
export type DateRequestStatus = 'pending' | 'accepted' | 'declined';

// Date Event Interface (matches OpenAPI DateEvent schema v2.3.0)
export interface DateEvent {
  id: string;
  hostUserId: string;
  acceptedUserId?: string; // User who was accepted to join the date
  barId: string; // Venue ID where the date takes place
  eventDate: string; // Date in YYYY-MM-DD format
  eventTime: string; // Time in HH:MM format
  eventDateTime: string; // ISO datetime string (combined eventDate + eventTime)
  isOpen: boolean; // Whether the event is still accepting requests
  lat?: number; // Latitude of the venue
  lng?: number; // Longitude of the venue
  status: DateEventStatus;
  createdAt: string; // ISO datetime string
  updatedAt?: string; // ISO datetime string
  // Backend may return capitalized versions
  Status?: string;
  EventDate?: string;
  EventTime?: string;
  EventDateTime?: string;
  IsOpen?: boolean;
  HostUserId?: string;
  // Additional populated fields for UI
  venue?: Venue;
  bar?: Venue; // Backend returns 'bar' instead of 'venue'
  hostUser?: UserResponse;
  acceptedUser?: UserResponse; // Populated accepted user data
  requests?: DateRequest[]; // Array of date requests for this event
}

// Date Request Interface (matches OpenAPI DateRequest schema)
export interface DateRequest {
  id: string;
  requesterUserId: string; // Updated to match API response
  requesterId?: string; // Legacy field for backward compatibility
  hostId?: string; // Optional for backward compatibility
  dateEventId: string;
  status: DateRequestStatus;
  requestedAt: string; // ISO datetime string
  // Additional populated fields for UI
  requester?: UserResponse;
  host?: UserResponse;
  dateEvent?: DateEvent;
}

// Create Date Event Request (matches OpenAPI spec v2.6.0)
export interface CreateDateEventRequest {
  hostUserId: string;
  barId: string;
  eventDate: string; // Date in YYYY-MM-DD format
  eventTime: string; // Time in HH:MM format
}

// Request to Join Date Event (matches OpenAPI spec)
export interface JoinDateEventRequest {
  dateEventId: string;
  requesterId: string;
}

// Respond to Date Request (matches actual API implementation)
export interface DateRequestResponse {
  accept: boolean;
}

// Date Events in Area Request (matches OpenAPI spec v2.6.0)
export interface DateEventsInAreaRequest {
  lat: number;
  lng: number;
  radius: number; // radius in kilometers
  requestingUserId: string;
  minAge?: number; // Optional minimum age filter
  maxAge?: number; // Optional maximum age filter
  excludeRequested?: boolean; // Optional flag to exclude already-requested events
}

// Legacy interfaces for backward compatibility
export interface UpdateDateEventRequest {
  title?: string;
  description?: string;
  eventDate?: string; // ISO datetime string
  maxAttendees?: number; // 2-20
}

export interface DateEventWithAttendees extends DateEvent {
  attendees: UserResponse[];
}

// Utility function to normalize date event data from API response
export const normalizeDateEvent = (apiEvent: any): DateEvent => {
  // Normalize status - default to 'open' if not provided
  const status = apiEvent.status || apiEvent.Status || 'open';

  return {
    ...apiEvent,
    // Normalize casing inconsistencies
    status: status,
    eventDate: apiEvent.eventDate || apiEvent.EventDate,
    eventTime: apiEvent.eventTime || apiEvent.EventTime,
    eventDateTime: apiEvent.eventDateTime || apiEvent.EventDateTime,
    isOpen: apiEvent.isOpen !== undefined ? apiEvent.isOpen : apiEvent.IsOpen,
    hostUserId: apiEvent.hostUserId || apiEvent.HostUserId,
    // Ensure barId is set from venue/bar id or use a fallback
    barId: apiEvent.barId || apiEvent.venue?.id || apiEvent.bar?.id || '',
    // Normalize coordinate fields
    lat:
      apiEvent.lat ||
      apiEvent.latitude ||
      apiEvent.venue?.lat ||
      apiEvent.bar?.lat,
    lng:
      apiEvent.lng ||
      apiEvent.longitude ||
      apiEvent.venue?.lng ||
      apiEvent.bar?.lng,
    // Map bar to venue for consistency
    venue: apiEvent.venue || apiEvent.bar,
    // Ensure required fields have defaults
    updatedAt: apiEvent.updatedAt || apiEvent.createdAt,
  };
};
