import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TonightLogo from '../components/TonightLogo';
import { useAuth } from '../contexts/AuthContext';
import { dateEventService, venueService } from '../services';
import { Bar, CreateDateEventRequest } from '../types';

export default function CreateDateEventScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Form state
  const [formData, setFormData] = useState<CreateDateEventRequest>({
    hostUserId: user?.username || '',
    barId: '',
    eventDate: '',
    eventTime: '',
  });

  // UI state
  const [selectedVenue, setSelectedVenue] = useState<Bar | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);

  // Location state
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<string[]>([]);
  const [searchRadius, setSearchRadius] = useState<number>(10); // Default 10km radius

  // Venue type options
  const venueTypeOptions = [
    { id: 'bar', label: 'Bars' },
    { id: 'restaurant', label: 'Restaurants' },
    { id: 'coffee-shop', label: 'Coffee Shops' },
    { id: 'hike', label: 'Hikes' },
  ];

  // Update hostUserId when user changes
  useEffect(() => {
    if (user?.username) {
      setFormData(prev => ({
        ...prev,
        hostUserId: user.username,
      }));
    }
  }, [user]);

  // Get user's current location
  useEffect(() => {
    const getCurrentLocation = async () => {
      if (!locationPermissionAsked) {
        setLocationPermissionAsked(true);
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            });
            setUseCurrentLocation(true);
          }
        } catch (error) {
          console.error('Failed to get location:', error);
        }
      }
    };

    getCurrentLocation();
  }, [locationPermissionAsked]);

  // Query to fetch available cities from backend
  const citiesQuery = useQuery({
    queryKey: ['cities'],
    queryFn: () => venueService.getCities(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Enhanced venue query that automatically loads venues based on location or city
  const venuesQuery = useQuery({
    queryKey: [
      'venues',
      userLocation,
      selectedCity,
      useCurrentLocation,
      selectedVenueTypes,
      searchRadius,
      formData.eventDate, // Include event date for date-based filtering
    ],
    queryFn: async () => {
      try {
        console.log('Venues query triggered:', {
          useCurrentLocation,
          userLocation,
          selectedCity,
          selectedVenueTypes,
          searchRadius,
        });

        // Use location-based search if user location is available and enabled
        if (useCurrentLocation && userLocation) {
          console.log('Fetching venues by location:', userLocation);
          const venues = await venueService.getBars({
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius: searchRadius * 1000, // Convert km to meters for API
            venueTypes:
              selectedVenueTypes.length > 0 ? selectedVenueTypes : undefined,
            eventDate: formData.eventDate || undefined, // Include event date for filtering
          });
          console.log('Venues found by location:', venues.length);
          return venues;
        }

        // Use city-based search if city is selected
        if (selectedCity) {
          console.log('Fetching venues by city:', selectedCity);
          const venues = await venueService.getBars({
            city: selectedCity,
            radius: searchRadius * 1000, // Convert km to meters for API
            venueTypes:
              selectedVenueTypes.length > 0 ? selectedVenueTypes : undefined,
            eventDate: formData.eventDate || undefined, // Include event date for filtering
          });
          console.log('Venues found by city:', venues.length);
          return venues;
        }

        // Return empty array if no location/city selected
        console.log('No location or city selected, returning empty array');
        return [];
      } catch (error) {
        console.error('Venues query error:', error);
        throw error;
      }
    },
    enabled:
      (useCurrentLocation && userLocation !== null) || selectedCity.length > 0,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (eventData: CreateDateEventRequest) =>
      dateEventService.createDateEvent(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateEvents'] });
      Alert.alert('Success', 'Date event created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      console.error('Failed to create event:', error);
      Alert.alert('Error', error.message || 'Failed to create event');
    },
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      // Update scheduledTime with combined date and time
      updateScheduledTime(selectedDate, selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Update scheduledTime with combined date and time
      updateScheduledTime(selectedDate, selectedTime);
    }
  };

  const updateScheduledTime = (date: Date, time: Date) => {
    // Format date as YYYY-MM-DD
    const eventDate = date.toISOString().split('T')[0];

    // Format time as HH:MM
    const eventTime = `${time.getHours().toString().padStart(2, '0')}:${time
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    setFormData(prev => ({
      ...prev,
      eventDate,
      eventTime,
    }));
  };

  const handleVenueSelect = (venue: Bar) => {
    setSelectedVenue(venue);
    setFormData(prev => ({ ...prev, barId: venue.id }));
  };

  const handleSubmit = () => {
    if (!formData.barId || !formData.eventDate || !formData.eventTime) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Error', 'Please log in to create events');
      return;
    }

    createEventMutation.mutate(formData);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TonightLogo size="medium" />
        <Text style={styles.subtitle}>Plan your perfect date night!</Text>
      </View>

      <View style={styles.form}>
        {/* Location Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Search Location</Text>
          <View style={styles.locationOptions}>
            <TouchableOpacity
              style={[
                styles.locationButton,
                useCurrentLocation && styles.locationButtonActive,
              ]}
              onPress={() => setUseCurrentLocation(true)}>
              <Text
                style={[
                  styles.locationButtonText,
                  useCurrentLocation && styles.locationButtonTextActive,
                ]}>
                📍 Use Current Location
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.locationButton,
                !useCurrentLocation && styles.locationButtonActive,
              ]}
              onPress={() => setUseCurrentLocation(false)}>
              <Text
                style={[
                  styles.locationButtonText,
                  !useCurrentLocation && styles.locationButtonTextActive,
                ]}>
                🏙️ Select City
              </Text>
            </TouchableOpacity>
          </View>

          {!useCurrentLocation && (
            <View style={styles.citySelection}>
              <Text style={styles.sublabel}>Choose a city:</Text>
              {citiesQuery.isLoading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : citiesQuery.error ? (
                <Text style={styles.errorText}>Failed to load cities</Text>
              ) : (
                <View style={styles.cityButtons}>
                  {citiesQuery.data?.map((city: string) => (
                    <TouchableOpacity
                      key={city}
                      style={[
                        styles.cityButton,
                        selectedCity === city && styles.cityButtonActive,
                      ]}
                      onPress={() => setSelectedCity(city)}>
                      <Text
                        style={[
                          styles.cityButtonText,
                          selectedCity === city && styles.cityButtonTextActive,
                        ]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Search Radius */}
        {(useCurrentLocation || selectedCity) && (
          <View style={styles.section}>
            <Text style={styles.label}>Search Radius</Text>
            <Text style={styles.sublabel}>
              How far to search for venues: {searchRadius}km
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
        )}

        {/* Venue Type Filters */}
        <View style={styles.section}>
          <Text style={styles.label}>Filter by Venue Type (Optional)</Text>
          <Text style={styles.sublabel}>
            Select one or more types to filter results
          </Text>
          <View style={styles.venueTypeContainer}>
            {venueTypeOptions.map(venueType => (
              <TouchableOpacity
                key={venueType.id}
                style={[
                  styles.venueTypeButton,
                  selectedVenueTypes.includes(venueType.id) &&
                    styles.venueTypeButtonActive,
                ]}
                onPress={() => {
                  const isSelected = selectedVenueTypes.includes(venueType.id);
                  if (isSelected) {
                    setSelectedVenueTypes(prev =>
                      prev.filter(type => type !== venueType.id)
                    );
                  } else {
                    setSelectedVenueTypes(prev => [...prev, venueType.id]);
                  }
                }}>
                <Text
                  style={[
                    styles.venueTypeButtonText,
                    selectedVenueTypes.includes(venueType.id) &&
                      styles.venueTypeButtonTextActive,
                  ]}>
                  {venueType.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Venue Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Venue</Text>
          {(formData.eventDate || searchRadius !== 10) && (
            <Text style={styles.sublabel}>
              {formData.eventDate && `Filtered for ${formData.eventDate}`}
              {formData.eventDate && searchRadius !== 10 && ' • '}
              {searchRadius !== 10 && `Within ${searchRadius}km radius`}
            </Text>
          )}

          {/* Venue Dropdown Container */}
          <View style={styles.dropdownWrapper}>
            {/* Venue Dropdown Button */}
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowVenueDropdown(!showVenueDropdown)}>
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownText}>
                  {selectedVenue
                    ? selectedVenue.name
                    : venuesQuery.isLoading
                    ? 'Loading venues...'
                    : venuesQuery.error
                    ? 'Error loading venues'
                    : !useCurrentLocation && !selectedCity
                    ? 'Please select location first'
                    : venuesQuery.data &&
                      Array.isArray(venuesQuery.data) &&
                      venuesQuery.data.length === 0
                    ? 'No venues available'
                    : 'Choose a venue'}
                </Text>
                <Text style={styles.dropdownArrow}>
                  {showVenueDropdown ? '▲' : '▼'}
                </Text>
              </View>
              {selectedVenue && (
                <Text style={styles.dropdownSubtext}>
                  {selectedVenue.address}
                </Text>
              )}
            </TouchableOpacity>

            {/* Dropdown List */}
            {showVenueDropdown && (
              <>
                {/* Invisible backdrop to close dropdown when tapping outside */}
                <TouchableOpacity
                  style={styles.dropdownBackdrop}
                  onPress={() => setShowVenueDropdown(false)}
                  activeOpacity={1}
                />
                <View style={styles.dropdownContainer}>
                  {venuesQuery.isLoading && (
                    <View style={styles.dropdownLoadingContainer}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.dropdownLoadingText}>
                        Loading venues...
                      </Text>
                    </View>
                  )}

                  {venuesQuery.data &&
                    Array.isArray(venuesQuery.data) &&
                    venuesQuery.data.length > 0 && (
                      <ScrollView
                        style={styles.dropdownList}
                        nestedScrollEnabled={true}>
                        {(venuesQuery.data as Bar[])
                          .filter(
                            (venue: Bar, index: number, array: Bar[]) =>
                              // Remove duplicates by keeping only the first occurrence of each ID
                              array.findIndex(v => v.id === venue.id) === index
                          )
                          .map((venue: Bar, index: number) => (
                            <TouchableOpacity
                              key={`venue-${venue.id}-${index}`}
                              style={[
                                styles.dropdownItem,
                                selectedVenue?.id === venue.id &&
                                  styles.dropdownItemSelected,
                              ]}
                              onPress={() => {
                                handleVenueSelect(venue);
                                setShowVenueDropdown(false);
                              }}>
                              <Text style={styles.dropdownItemName}>
                                {venue.name}
                              </Text>
                              <Text style={styles.dropdownItemAddress}>
                                {venue.address}
                              </Text>
                              {venue.rating && (
                                <Text style={styles.dropdownItemRating}>
                                  ⭐ {venue.rating.toFixed(1)}
                                </Text>
                              )}
                              {selectedVenue?.id === venue.id && (
                                <Text style={styles.dropdownItemSelected}>
                                  ✓
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    )}

                  {venuesQuery.data &&
                    Array.isArray(venuesQuery.data) &&
                    venuesQuery.data.length === 0 &&
                    !venuesQuery.isLoading && (
                      <View style={styles.dropdownEmptyContainer}>
                        <Text style={styles.dropdownEmptyText}>
                          No venues found in this area
                        </Text>
                      </View>
                    )}

                  {venuesQuery.error && (
                    <View style={styles.dropdownEmptyContainer}>
                      <Text style={styles.dropdownEmptyText}>
                        Error: {venuesQuery.error.message}
                      </Text>
                    </View>
                  )}

                  {!useCurrentLocation && !selectedCity && (
                    <View style={styles.dropdownEmptyContainer}>
                      <Text style={styles.dropdownEmptyText}>
                        Please select your location or city first
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>

          {selectedVenue && (
            <View style={styles.selectedVenue}>
              <Text style={styles.selectedVenueTitle}>Selected Venue:</Text>
              <Text style={styles.selectedVenueName}>{selectedVenue.name}</Text>
              <Text style={styles.selectedVenueAddress}>
                {selectedVenue.address}
              </Text>
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateTimeText}>
              {formData.eventDate || 'Select Date'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Time</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}>
            <Text style={styles.dateTimeText}>
              {formData.eventTime || 'Select Time'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            createEventMutation.isPending && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={createEventMutation.isPending}>
          {createEventMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Date Event</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    textAlign: 'center',
    padding: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  venueList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    maxHeight: 200,
  },
  loading: {
    padding: 20,
  },
  venueItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  venueAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  venueRating: {
    fontSize: 14,
    color: '#f39c12',
    marginTop: 2,
  },
  venueItemSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  selectedIndicator: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noVenuesContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  noVenuesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  noLocationContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  noLocationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  selectedVenue: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedVenueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 4,
  },
  selectedVenueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedVenueAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Location selection styles
  locationOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  locationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  locationButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  locationButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  locationButtonTextActive: {
    color: '#fff',
  },
  citySelection: {
    marginTop: 10,
  },
  sublabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  cityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cityButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  cityButtonText: {
    fontSize: 13,
    color: '#666',
  },
  cityButtonTextActive: {
    color: '#fff',
  },
  venueTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  venueTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  venueTypeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  venueTypeButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  venueTypeButtonTextActive: {
    color: '#fff',
  },
  // Dropdown styles
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    marginTop: 4,
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  dropdownSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: -1,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dropdownItemAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dropdownItemRating: {
    fontSize: 14,
    color: '#f39c12',
    marginTop: 2,
  },
  dropdownLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  dropdownEmptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Radius selection styles
  radiusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
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
});
