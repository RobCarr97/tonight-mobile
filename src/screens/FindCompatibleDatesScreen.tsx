import { useMutation, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import TonightLogo from '../components/TonightLogo';
import { useAuth } from '../contexts/AuthContext';
import { dateEventService } from '../services';
import { DateEvent, DateEventsInAreaRequest } from '../types';

const FindCompatibleDatesScreen: React.FC = () => {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>({
    latitude: 53.4808, // Default to Manchester
    longitude: -2.2426,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DateEvent | null>(null);
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Get user's current location on initial load
  useEffect(() => {
    (async () => {
      try {
        console.log('Requesting location permissions...');
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied');
          Alert.alert(
            'Location Permission',
            'Location permission is helpful to find nearby dates, but you can still use the app by manually navigating the map.'
          );
          return;
        }

        console.log('Getting current position...');
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        console.log('User location obtained:', location.coords);

        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05, // ~5km view
          longitudeDelta: 0.05,
        };

        console.log('Setting initial region to user location:', newRegion);
        setRegion(newRegion);
        setHasUserLocation(true);
        setUserCoordinates({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Use a longer delay to ensure the map component is fully rendered
        setTimeout(() => {
          if (mapRef.current) {
            console.log('Animating to user location...');
            mapRef.current.animateToRegion(newRegion, 1500);
          }
        }, 1000);
      } catch (error) {
        console.error('Error getting location:', error);
        console.log('Continuing with default Manchester location');
        // Continue with default Manchester location - no need to show error
      }
    })();
  }, []);

  // Build search parameters
  // Calculate radius based on current map view (use the larger of lat/lng delta)
  const latRadiusMeters = (region.latitudeDelta * 111000) / 2; // Convert latitude degrees to meters
  const lngRadiusMeters =
    (region.longitudeDelta *
      111000 *
      Math.cos((region.latitude * Math.PI) / 180)) /
    2;
  const mapViewRadius = Math.max(latRadiusMeters, lngRadiusMeters);

  // Use reasonable bounds for the radius
  const minRadius = 1000; // Minimum 1km
  const maxRadius = 100000; // Maximum 100km (matches API limit and zoom constraint)

  // Use map view radius, but cap it within reasonable bounds
  const effectiveRadius = Math.min(
    Math.max(minRadius, mapViewRadius),
    maxRadius
  );

  console.log('=== RADIUS CALCULATION DEBUG ===');
  console.log(
    'Region deltas - lat:',
    region.latitudeDelta.toFixed(6),
    'lng:',
    region.longitudeDelta.toFixed(6)
  );
  console.log('Lat radius (m):', latRadiusMeters.toFixed(0));
  console.log('Lng radius (m):', lngRadiusMeters.toFixed(0));
  console.log('Map view radius (m):', mapViewRadius.toFixed(0));
  console.log('Effective radius (m):', effectiveRadius);
  console.log('Effective radius (km):', (effectiveRadius / 1000).toFixed(1));

  const searchParams: DateEventsInAreaRequest = {
    lat: region.latitude,
    lng: region.longitude,
    radius: effectiveRadius, // API now accepts float values in meters
    requestingUserId: user?.id || user?.username || user?.email || '',
    ...(minAge && { minAge: parseInt(minAge) }),
    ...(maxAge && { maxAge: parseInt(maxAge) }),
    excludeRequested: false,
  };

  // Try a simpler query approach first
  const simpleQuery = useQuery<DateEvent[], Error>({
    queryKey: [
      'compatibleDates',
      Math.round(region.latitude * 100) / 100, // Round to 2 decimal places for more stability (~1km precision)
      Math.round(region.longitude * 100) / 100,
      Math.round(effectiveRadius / 5000) * 5, // Round to nearest 5km for stability (in meters)
      user?.id,
      minAge,
      maxAge,
    ],
    queryFn: async () => {
      try {
        console.log('=== QUERY EXECUTION ===');
        console.log('Calling dateEventService.getDateEventsInArea with:', {
          ...searchParams,
          radius: `${(searchParams.radius / 1000).toFixed(1)}km (${
            searchParams.radius
          }m)`,
        });

        // Validate parameters before making the call
        if (!searchParams.lat || !searchParams.lng) {
          throw new Error(
            'Invalid coordinates: lat=' +
              searchParams.lat +
              ', lng=' +
              searchParams.lng
          );
        }
        if (!searchParams.radius || searchParams.radius <= 0) {
          throw new Error('Invalid radius: ' + searchParams.radius + 'm');
        }
        if (searchParams.radius > maxRadius) {
          throw new Error(
            'Radius too large: ' +
              (searchParams.radius / 1000).toFixed(1) +
              'km (max: ' +
              maxRadius / 1000 +
              'km)'
          );
        }
        if (!searchParams.requestingUserId) {
          throw new Error('Invalid user ID: ' + searchParams.requestingUserId);
        }

        const result = await dateEventService.getDateEventsInArea(searchParams);
        console.log('Query successful, returned:', result?.length, 'events');
        return result;
      } catch (error) {
        console.error('=== QUERY FAILED ===');
        console.error('Query error:', error);
        console.error(
          'Error message:',
          error instanceof Error ? error.message : String(error)
        );
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
    },
    enabled: !!user?.id && region.latitudeDelta <= 1.8, // Disable if zoomed out beyond 100km radius
    staleTime: 10000, // 10 seconds - more frequent updates for hot reload
    refetchInterval: 15000, // Auto-refetch every 15 seconds (hot reload)
    retry: false,
  });

  const compatibleEvents = useMemo((): DateEvent[] => {
    console.log('=== SIMPLE QUERY STATE ===');
    console.log('Simple query data:', simpleQuery.data);
    console.log('Simple query status:', simpleQuery.status);
    console.log('Simple query error:', simpleQuery.error);

    // Log more detailed error information
    if (simpleQuery.error) {
      console.error('=== DETAILED ERROR INFO ===');
      console.error('Error object:', simpleQuery.error);
      console.error(
        'Error message:',
        simpleQuery.error instanceof Error
          ? simpleQuery.error.message
          : String(simpleQuery.error)
      );
      console.error(
        'Error stack:',
        simpleQuery.error instanceof Error
          ? simpleQuery.error.stack
          : 'No stack trace'
      );
      console.error(
        'Error name:',
        simpleQuery.error instanceof Error ? simpleQuery.error.name : 'Unknown'
      );
      console.error(
        'Full error JSON:',
        JSON.stringify(simpleQuery.error, null, 2)
      );
    }

    return (simpleQuery.data as DateEvent[]) || [];
  }, [simpleQuery.data, simpleQuery.status, simpleQuery.error]);

  // Use simpleQuery properties
  const { error, refetch } = simpleQuery;

  // Debug logging
  console.log('=== RENDER DEBUG ===');
  console.log('Search params:', searchParams);
  console.log('Compatible events from React Query:', compatibleEvents);
  console.log('Compatible events count:', compatibleEvents.length);
  console.log('Map region:', region);
  console.log('Query error:', error);
  console.log('User:', user);
  console.log('Query enabled:', !!user?.id);

  // Debug marker coordinates and full event data
  compatibleEvents.forEach((event, index) => {
    console.log(`Event ${index} (${event.id}):`, {
      id: event.id,
      hostUserId: event.hostUserId,
      lat: event.lat,
      lng: event.lng,
      venue: event.venue,
      bar: event.bar,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      isOpen: event.isOpen,
      status: event.status,
      fullEvent: event,
    });
  });

  // Mutation for joining events
  const joinEventMutation = useMutation({
    mutationFn: (eventId: string) =>
      dateEventService.requestToJoinDateEvent({
        dateEventId: eventId,
        requesterId: user?.id || user?.username || '',
      }),
    onSuccess: () => {
      Alert.alert('Success', 'Join request sent successfully!');
      refetch(); // Refresh the events
    },
    onError: error => {
      console.error('Join request failed:', error);
      Alert.alert('Error', 'Failed to send join request. Please try again.');
    },
  });

  // Note: Removed forced map updates to allow proper user location focusing

  // Debug helper: Log all raw API data
  useEffect(() => {
    if (compatibleEvents.length > 0) {
      console.log('=== RAW API DATA DEBUG ===');
      compatibleEvents.forEach((event, i) => {
        console.log(`Raw event ${i}:`, JSON.stringify(event, null, 2));
      });
    }
  }, [compatibleEvents]);

  const handleJoinEvent = (eventId: string) => {
    Alert.alert(
      'Join Date Event',
      'Are you sure you want to send a join request for this date?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join', onPress: () => joinEventMutation.mutate(eventId) },
      ]
    );
  };

  const formatEventDateTime = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return dateTime.toLocaleString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return `${date} at ${time}`;
    }
  };

  const renderEventDetails = (event: DateEvent) => (
    <Modal
      visible={selectedEvent?.id === event.id}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedEvent(null)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Date Event Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedEvent(null)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.eventTitle}>Date Event</Text>
          <Text style={styles.eventDescription}>
            Join me for a great evening!
          </Text>

          <View style={styles.eventInfo}>
            <Text style={styles.infoLabel}>When:</Text>
            <Text style={styles.infoText}>
              {formatEventDateTime(event.eventDate, event.eventTime)}
            </Text>
          </View>

          <View style={styles.eventInfo}>
            <Text style={styles.infoLabel}>Host:</Text>
            <Text style={styles.infoText}>{event.hostUserId}</Text>
          </View>

          <View style={styles.eventInfo}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text
              style={[
                styles.infoText,
                { color: event.isOpen ? '#28a745' : '#6c757d' },
              ]}>
              {event.isOpen ? 'Open for requests' : 'Not available'}
            </Text>
          </View>

          {event.isOpen && (
            <TouchableOpacity
              style={[
                styles.joinButton,
                joinEventMutation.isPending && styles.disabledButton,
              ]}
              onPress={() => handleJoinEvent(event.id)}
              disabled={joinEventMutation.isPending}>
              <Text style={styles.joinButtonText}>
                {joinEventMutation.isPending
                  ? 'Sending Request...'
                  : 'Send Join Request'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Search Filters</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFilters(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filtersContent}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Min Age</Text>
            <TextInput
              style={styles.filterInput}
              value={minAge}
              onChangeText={setMinAge}
              keyboardType="numeric"
              placeholder="18"
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Max Age</Text>
            <TextInput
              style={styles.filterInput}
              value={maxAge}
              onChangeText={setMaxAge}
              keyboardType="numeric"
              placeholder="65"
            />
          </View>

          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => {
              setShowFilters(false);
              refetch();
            }}>
            <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading compatible dates</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TonightLogo size="small" />
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}>
            <Text style={styles.filterButtonText}>⚙️ Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChange={newRegion => {
          // Only allow zoom changes, prevent panning by keeping center fixed to user location
          if (hasUserLocation && userCoordinates) {
            // Keep the center fixed to the original user location, allow zoom changes
            const correctedRegion = {
              latitude: userCoordinates.latitude,
              longitude: userCoordinates.longitude,
              latitudeDelta: newRegion.latitudeDelta,
              longitudeDelta: newRegion.longitudeDelta,
            };

            // Limit zoom out to 100km radius
            const maxLatitudeDelta = 1.8;
            const maxLongitudeDelta = 1.8;

            if (
              correctedRegion.latitudeDelta > maxLatitudeDelta ||
              correctedRegion.longitudeDelta > maxLongitudeDelta
            ) {
              const constrainedRegion = {
                latitude: userCoordinates.latitude,
                longitude: userCoordinates.longitude,
                latitudeDelta: Math.min(
                  correctedRegion.latitudeDelta,
                  maxLatitudeDelta
                ),
                longitudeDelta: Math.min(
                  correctedRegion.longitudeDelta,
                  maxLongitudeDelta
                ),
              };
              mapRef.current?.animateToRegion(constrainedRegion, 200);
            } else {
              // Apply the corrected region if within zoom limits
              if (mapRef.current) {
                mapRef.current.animateToRegion(correctedRegion, 100);
              }
            }
          } else {
            // If no user location, allow normal map behavior with zoom limits
            const maxLatitudeDelta = 1.8;
            const maxLongitudeDelta = 1.8;

            if (
              newRegion.latitudeDelta > maxLatitudeDelta ||
              newRegion.longitudeDelta > maxLongitudeDelta
            ) {
              const constrainedRegion = {
                ...newRegion,
                latitudeDelta: Math.min(
                  newRegion.latitudeDelta,
                  maxLatitudeDelta
                ),
                longitudeDelta: Math.min(
                  newRegion.longitudeDelta,
                  maxLongitudeDelta
                ),
              };
              mapRef.current?.animateToRegion(constrainedRegion, 200);
            }
          }
        }}
        onRegionChangeComplete={newRegion => {
          // Always keep the center fixed to user location when we have it
          if (hasUserLocation && userCoordinates) {
            const correctedRegion = {
              ...newRegion,
              latitude: userCoordinates.latitude,
              longitude: userCoordinates.longitude,
            };
            setRegion(correctedRegion);
          } else {
            setRegion(newRegion);
          }
        }}
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}>
        {compatibleEvents.map((event, index) => {
          console.log(`Rendering marker ${index} for event ${event.id}:`, {
            lat: event.lat,
            lng: event.lng,
            hasValidCoordinates: event.lat != null && event.lng != null,
            coordinateTypes: { lat: typeof event.lat, lng: typeof event.lng },
            latValue: event.lat,
            lngValue: event.lng,
          });

          const venueName =
            event.venue?.name || event.bar?.name || 'Unknown Venue';
          const eventTitle = `${venueName}`;
          const eventDescription = `${formatEventDateTime(
            event.eventDate,
            event.eventTime
          )}`;

          console.log(`Marker details for event ${event.id}:`, {
            venueName,
            eventTitle,
            eventDescription,
            coordinateForMarker: {
              latitude: event.lat!,
              longitude: event.lng!,
            },
          });

          return (
            <Marker
              key={`event-${event.id}-${index}`}
              coordinate={{
                latitude: event.lat!,
                longitude: event.lng!,
              }}
              title={eventTitle}
              description={eventDescription}
              pinColor="red"
              onPress={() => {
                console.log('Marker pressed for event:', event.id);
                setSelectedEvent(event);
              }}
            />
          );
        })}

        {/* User location marker removed - map centers directly on user location */}
      </MapView>

      {/* Status Indicator */}
      <View style={styles.statusIndicator}>
        {region.latitudeDelta > 1.8 ? (
          <Text style={styles.statusText}>
            Zoom in to search for events (max zoom: 100km radius)
          </Text>
        ) : (
          <Text style={styles.statusText}>
            {compatibleEvents.length} events found (radius:{' '}
            {(effectiveRadius / 1000).toFixed(1)}km • zoom to adjust)
            {simpleQuery.isFetching && ' 🔄'}
          </Text>
        )}
        {error && (
          <Text style={[styles.statusText, { color: 'red' }]}>
            Error: {String(error)}
          </Text>
        )}
      </View>

      {/* Event Details Modal */}
      {selectedEvent && renderEventDetails(selectedEvent)}

      {/* Filters Modal */}
      {renderFiltersModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8A2BE2',
    letterSpacing: 2,
  },
  map: {
    flex: 1,
  },
  profileMarker: {
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  profileImage: {
    width: 50,
    height: 50,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  eventDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  eventInfo: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
  },
  joinButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  filtersContent: {
    padding: 16,
  },
  filterRow: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  applyFiltersButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  applyFiltersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Radius selection styles
  filterSection: {
    marginBottom: 20,
  },
  filterSublabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  // Filter button styles
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Status indicator styles
  statusIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  centerButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  centerButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default FindCompatibleDatesScreen;
