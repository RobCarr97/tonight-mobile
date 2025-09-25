import { useMutation, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
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

  const [searchRadius, setSearchRadius] = useState(10); // km
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DateEvent | null>(null);

  // Get user's current location
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission denied',
            'Location permission is required to find nearby dates'
          );
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(newRegion);

        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Location Error', 'Could not get your current location');
      }
    })();
  }, []);

  // Build search parameters
  const searchParams: DateEventsInAreaRequest = {
    lat: region.latitude,
    lng: region.longitude,
    radius: searchRadius * 1000, // Convert km to meters for backend API
    requestingUserId: user?.id || user?.username || '',
    ...(minAge && { minAge: parseInt(minAge) }),
    ...(maxAge && { maxAge: parseInt(maxAge) }),
    excludeRequested: true, // Don't show events user has already requested
  };

  // Query for compatible date events in area
  const {
    data: compatibleEvents = [],
    error,
    refetch,
  } = useQuery({
    queryKey: ['compatibleDates', searchParams],
    queryFn: () => dateEventService.getDateEventsInArea(searchParams),
    enabled: !!user && !!searchParams.requestingUserId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Debug logging
  console.log('=== RENDER DEBUG ===');
  console.log('Search params:', searchParams);
  console.log('Compatible events count:', compatibleEvents.length);
  console.log('Map region:', region);
  console.log('Query error:', error);

  // Debug marker coordinates
  compatibleEvents.forEach((event, index) => {
    console.log(`Event ${index}:`, {
      id: event.id,
      lat: event.lat,
      lng: event.lng,
      venue: event.venue,
      bar: event.bar,
      withinRegion:
        event.lat && event.lng
          ? Math.abs(event.lat - region.latitude) <= region.latitudeDelta / 2 &&
            Math.abs(event.lng - region.longitude) <= region.longitudeDelta / 2
          : false,
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

  // Force map to update when events are loaded
  useEffect(() => {
    if (compatibleEvents.length > 0 && mapRef.current) {
      console.log('Events loaded, forcing map update');
      // Small delay to ensure map is ready
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion(region, 100);
        }
      }, 500);
    }
  }, [compatibleEvents.length, region]);

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
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Search Radius</Text>
            <Text style={styles.filterSublabel}>
              Current radius: {searchRadius}km
            </Text>
            <View style={styles.radiusContainer}>
              {[1, 5, 10, 20, 50].map(radius => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusOption,
                    searchRadius === radius && styles.radiusOptionSelected,
                  ]}
                  onPress={() => setSearchRadius(radius)}>
                  <Text
                    style={[
                      styles.radiusOptionText,
                      searchRadius === radius &&
                        styles.radiusOptionTextSelected,
                    ]}>
                    {radius}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}>
          <Text style={styles.filterButtonText}>⚙️ Filters</Text>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}>
        {compatibleEvents
          .map((event, index) => {
            // Check if coordinates exist and are valid numbers
            if (
              !event.lat ||
              !event.lng ||
              typeof event.lat !== 'number' ||
              typeof event.lng !== 'number' ||
              isNaN(event.lat) ||
              isNaN(event.lng)
            ) {
              return null;
            }

            const venueName =
              event.venue?.name || event.bar?.name || 'Unknown Venue';
            const eventTitle = `${venueName}`;
            const eventDescription = `${formatEventDateTime(
              event.eventDate,
              event.eventTime
            )}`;

            return (
              <Marker
                key={`event-${event.id}-${index}`}
                coordinate={{
                  latitude: Number(event.lat),
                  longitude: Number(event.lng),
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
          })
          .filter(Boolean)}
      </MapView>

      {/* Status Indicator */}
      <View style={styles.statusIndicator}>
        <Text style={styles.statusText}>
          {compatibleEvents.length} events found •{' '}
          {compatibleEvents.filter(e => e.lat && e.lng).length} on map
        </Text>
        {compatibleEvents.length > 0 && (
          <TouchableOpacity
            style={styles.centerButton}
            onPress={() => {
              const firstEvent = compatibleEvents[0];
              if (firstEvent.lat && firstEvent.lng && mapRef.current) {
                console.log('Centering map on first event:', {
                  lat: firstEvent.lat,
                  lng: firstEvent.lng,
                });
                const newRegion = {
                  latitude: firstEvent.lat,
                  longitude: firstEvent.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                };
                mapRef.current.animateToRegion(newRegion, 1000);
              }
            }}>
            <Text style={styles.centerButtonText}>Center on Event</Text>
          </TouchableOpacity>
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
  radiusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  radiusOption: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  radiusOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radiusOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  radiusOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Filter button styles
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
