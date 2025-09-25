import {
  CreateDateEventRequest,
  DateEvent,
  DateEventsInAreaRequest,
  DateEventWithAttendees,
  DateRequest,
  DateRequestResponse,
  JoinDateEventRequest,
  normalizeDateEvent,
} from '../types';
import { apiClient, ApiError } from './apiClient';

class DateEventService {
  // Get all date events (matches GET /date-events)
  async getDateEvents(): Promise<DateEvent[]> {
    try {
      const response = await apiClient.get<any>('/date-events');
      console.log('Date events service received:', response);

      // Backend returns data in format: { data: [...events...], message, success }
      // We need to extract the events array
      const events =
        response.data && Array.isArray(response.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

      console.log('Extracted events:', events);
      return events.map(normalizeDateEvent);
    } catch (error) {
      console.error('Date events service error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get date events', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Create a new date event (matches POST /date-events)
  async createDateEvent(eventData: CreateDateEventRequest): Promise<DateEvent> {
    try {
      const response = await apiClient.post<DateEvent>(
        '/date-events',
        eventData
      );
      // Normalize the response data to handle casing inconsistencies
      return normalizeDateEvent(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to create date event', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get compatible date events in area (matches GET /date-events/in-area v2.6.0)
  async getDateEventsInArea(
    params: DateEventsInAreaRequest
  ): Promise<DateEvent[]> {
    try {
      // Validate required parameters
      if (!params.requestingUserId || params.requestingUserId.trim() === '') {
        throw new ApiError('User ID is required', 400, [
          'requestingUserId cannot be empty',
        ]);
      }
      const queryParams = new URLSearchParams({
        lat: params.lat.toString(),
        lng: params.lng.toString(),
        radius: params.radius.toString(),
        requestingUserId: params.requestingUserId,
      });

      // Add optional age parameters if provided
      if (params.minAge !== undefined) {
        queryParams.append('minAge', params.minAge.toString());
      }
      if (params.maxAge !== undefined) {
        queryParams.append('maxAge', params.maxAge.toString());
      }
      // Add optional excludeRequested parameter if provided
      if (params.excludeRequested !== undefined) {
        queryParams.append(
          'excludeRequested',
          params.excludeRequested.toString()
        );
      }
      const response = await apiClient.get<any>(
        `/date-events/in-area?${queryParams}`
      );

      console.log('Date events in area API response:', response);

      // Backend returns data in format: { data: [...events...], message, success }
      // We need to extract the events array
      const events =
        response.data && Array.isArray(response.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

      console.log('Extracted events before normalization:', events);

      // Normalize the response data to handle casing inconsistencies
      const normalizedEvents = events.map(normalizeDateEvent);
      console.log('Events after normalization:', normalizedEvents);

      return normalizedEvents;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get date events in area', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Request to join a date event (matches POST /date-events/request)
  async requestToJoinDateEvent(
    requestData: JoinDateEventRequest
  ): Promise<DateRequest> {
    try {
      // Validate required parameters
      if (!requestData.requesterId || requestData.requesterId.trim() === '') {
        throw new ApiError('User ID is required', 400, [
          'requesterId cannot be empty',
        ]);
      }
      if (!requestData.dateEventId || requestData.dateEventId.trim() === '') {
        throw new ApiError('Date Event ID is required', 400, [
          'dateEventId cannot be empty',
        ]);
      }

      const response = await apiClient.post<DateRequest>(
        '/date-events/request',
        requestData
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to request to join date event', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Respond to a date request (matches POST /date-events/request/{id}/respond)
  async respondToDateRequest(
    requestId: string,
    response: DateRequestResponse
  ): Promise<DateRequest> {
    try {
      // Validate required parameters
      if (!requestId || requestId.trim() === '') {
        throw new ApiError('Request ID is required', 400, [
          'requestId cannot be empty',
        ]);
      }
      if (response.accept === undefined || response.accept === null) {
        throw new ApiError('Accept field is required', 400, [
          'accept must be a boolean value',
        ]);
      }

      const responseData = await apiClient.post<DateRequest>(
        `/date-events/request/${requestId}/respond`,
        response
      );
      return responseData;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to respond to date request', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }
  // Get date requests for events hosted by a specific user
  // Since the OpenAPI spec doesn't have specific endpoints for user requests,
  // we get all date events and filter for the ones hosted by this user
  async getIncomingDateRequests(hostUserId: string): Promise<DateRequest[]> {
    try {
      // Validate required parameters
      if (!hostUserId || hostUserId.trim() === '') {
        throw new ApiError('Host User ID is required', 400, [
          'hostUserId cannot be empty',
        ]);
      }

      // Get all date events and filter for events hosted by this user
      const allEvents = await this.getDateEvents();
      const myEvents = allEvents.filter(
        event => event.hostUserId === hostUserId
      );

      // Extract all requests from events hosted by this user
      const allRequests: DateRequest[] = [];
      myEvents.forEach(event => {
        if (event.requests && event.requests.length > 0) {
          // Add the event information to each request for context
          const requestsWithEvent = event.requests.map(request => ({
            ...request,
            dateEvent: event,
          }));
          allRequests.push(...requestsWithEvent);
        }
      });

      return allRequests;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get incoming date requests', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get date requests made by a specific user
  // Since the OpenAPI spec doesn't have specific endpoints for user requests,
  // we get all date events and filter for requests made by this user
  async getOutgoingDateRequests(requesterId: string): Promise<DateRequest[]> {
    try {
      // Validate required parameters
      if (!requesterId || requesterId.trim() === '') {
        throw new ApiError('Requester User ID is required', 400, [
          'requesterId cannot be empty',
        ]);
      }

      // Get all date events and find requests made by this user
      const allEvents = await this.getDateEvents();
      const allRequests: DateRequest[] = [];

      allEvents.forEach(event => {
        if (event.requests && event.requests.length > 0) {
          const myRequests = event.requests.filter(
            request =>
              (request.requesterUserId || request.requesterId) === requesterId
          );
          // Add the event information to each request for context
          const requestsWithEvent = myRequests.map(request => ({
            ...request,
            dateEvent: event,
          }));
          allRequests.push(...requestsWithEvent);
        }
      });

      return allRequests;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get outgoing date requests', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get all events for a specific user (matches GET /date-events/user/{userId}/events)
  async getUserEvents(userId: string): Promise<DateEvent[]> {
    try {
      // Validate required parameters
      if (!userId || userId.trim() === '') {
        throw new ApiError('User ID is required', 400, [
          'userId cannot be empty',
        ]);
      }

      const response = await apiClient.get<DateEvent[]>(
        `/date-events/user/${userId}/events`
      );
      // Normalize the response data to handle casing inconsistencies
      return Array.isArray(response)
        ? response.map(normalizeDateEvent)
        : response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get user events', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get active events for a specific user (matches GET /date-events/user/{userId}/active)
  async getUserActiveEvents(userId: string): Promise<DateEvent[]> {
    try {
      // Validate required parameters
      if (!userId || userId.trim() === '') {
        throw new ApiError('User ID is required', 400, [
          'userId cannot be empty',
        ]);
      }

      const response = await apiClient.get<DateEvent[]>(
        `/date-events/user/${userId}/active`
      );
      // Normalize the response data to handle casing inconsistencies
      return Array.isArray(response)
        ? response.map(normalizeDateEvent)
        : response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get user active events', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Legacy methods for backward compatibility (these endpoints are not in the OpenAPI spec)

  // Get date event by ID (placeholder - not in OpenAPI spec)
  async getDateEvent(eventId: string): Promise<DateEvent> {
    try {
      const response = await apiClient.get<DateEvent>(
        `/date-events/${eventId}`
      );
      return normalizeDateEvent(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get date event', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get date events with attendees (placeholder - not in OpenAPI spec)
  async getDateEventWithAttendees(
    eventId: string
  ): Promise<DateEventWithAttendees> {
    try {
      const response = await apiClient.get<DateEventWithAttendees>(
        `/date-events/${eventId}/attendees`
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get date event attendees', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }

  // Get available (open) requests for a specific user
  async getAvailableRequests(userId: string): Promise<DateRequest[]> {
    try {
      // Validate required parameters
      if (!userId || userId.trim() === '') {
        throw new ApiError('User ID is required', 400, [
          'userId cannot be empty',
        ]);
      }

      const response = await apiClient.get<any>(
        `/date-events/available/${userId}`
      );

      // Handle different response formats
      const requests = Array.isArray(response)
        ? response
        : response.data && Array.isArray(response.data)
        ? response.data
        : [];

      return requests;
    } catch (error) {
      console.error('Get available requests error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to get available requests', 500, [
        error instanceof Error ? error.message : 'Unknown error',
      ]);
    }
  }
}

// Export singleton instance
export const dateEventService = new DateEventService();
export default dateEventService;
