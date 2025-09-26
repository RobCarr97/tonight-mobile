import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TonightLogo from '../../src/components/TonightLogo';
import { useAuth } from '../../src/contexts/AuthContext';
import { dateEventService, userService } from '../../src/services';
import { DateEvent } from '../../src/types';

const DashboardScreen: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Profile viewing state
  const [showPublicProfile, setShowPublicProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Get user's created events using the proper API endpoint
  const myEventsQuery = useQuery({
    queryKey: ['userEvents', currentUser?.username],
    queryFn: () => {
      return dateEventService.getUserEvents(currentUser!.username);
    },
    enabled: !!currentUser?.username,
    retry: 1, // Reduce retries to fail faster
    staleTime: 10000, // 10 seconds - hot reload
    refetchInterval: 20000, // Auto-refetch every 20 seconds
  });

  // Get user's available requests (events they can potentially join)
  const availableRequestsQuery = useQuery({
    queryKey: ['availableRequests', currentUser?.username],
    queryFn: () => {
      return dateEventService.getAvailableRequests(currentUser!.username);
    },
    enabled: !!currentUser?.username,
    retry: 1, // Reduce retries to fail faster
    staleTime: 15000, // 15 seconds - hot reload
    refetchInterval: 25000, // Auto-refetch every 25 seconds
  });

  // Get all events to find ones where user was accepted
  const allEventsQuery = useQuery({
    queryKey: ['allDateEvents'],
    queryFn: async () => {
      console.log('Fetching all date events...');
      try {
        const events = await dateEventService.getDateEvents();
        console.log('Date events received:', events);
        return events;
      } catch (error) {
        console.error('Failed to fetch date events:', error);
        throw error;
      }
    },
    enabled: !!currentUser?.username,
    retry: 1, // Reduce retries to fail faster
    staleTime: 12000, // 12 seconds - hot reload
    refetchInterval: 18000, // Auto-refetch every 18 seconds
  });

  // Public profile query
  const {
    data: publicProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ['publicProfile', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      return await userService.getPublicProfile(selectedUserId);
    },
    enabled: !!selectedUserId && showPublicProfile,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get events from proper API endpoints
  const myEvents =
    (myEventsQuery.data as any)?.data || myEventsQuery.data || [];
  const allEventsData = allEventsQuery.data || [];

  // Ensure we have an array to work with
  const allEvents = Array.isArray(allEventsData) ? allEventsData : [];

  console.log('Dashboard data processing:', {
    currentUsername: currentUser?.username,
    myEventsLength: myEvents.length,
    allEventsLength: allEvents.length,
    myEventsQuery: {
      isLoading: myEventsQuery.isLoading,
      isError: myEventsQuery.isError,
      error: myEventsQuery.error,
      data: myEventsQuery.data,
    },
  });

  // Current date for filtering future events
  const currentDate = new Date();

  // Combine both data sources for complete event data
  const allEventsWithMyEvents = [...allEvents];
  // Add events from myEvents that might have more complete data
  myEvents.forEach((myEvent: any) => {
    const existingIndex = allEventsWithMyEvents.findIndex(
      e => e.id === myEvent.id
    );
    if (existingIndex >= 0) {
      // Replace with more complete data from myEvents
      allEventsWithMyEvents[existingIndex] = myEvent;
    } else {
      // Add if not already present
      allEventsWithMyEvents.push(myEvent);
    }
  });

  // Upcoming Events: Events where user was accepted (either as host accepting someone or as requester who was accepted)
  const upcomingEvents = allEventsWithMyEvents.filter(event => {
    const eventDateTime = new Date(`${event.eventDate} ${event.eventTime}`);
    const isFuture = eventDateTime > currentDate;

    // Include if user was accepted to join someone else's event
    const wasAcceptedToJoin = event.acceptedUserId === currentUser?.username;

    // Include if user is host and has accepted someone to their event
    const isHostWithAcceptedUser =
      event.hostUserId === currentUser?.username && event.acceptedUserId;

    return isFuture && (wasAcceptedToJoin || isHostWithAcceptedUser);
  });

  // My Events: User's own events that are still open for requests
  const myHostedEvents = myEvents.filter((event: any) => {
    const eventDateTime = new Date(`${event.eventDate} ${event.eventTime}`);
    return (
      eventDateTime > currentDate &&
      event.status === 'open' &&
      !event.acceptedUserId // No one accepted yet
    );
  });

  // Debug: Check what's in both queries
  console.log('Events debugging:', {
    currentUsername: currentUser?.username,
    myEventsQuery: {
      data: myEventsQuery.data,
      isLoading: myEventsQuery.isLoading,
      error: myEventsQuery.error,
    },
    myEvents: myEvents,
    myHostedEvents: myHostedEvents,
    allEventsQuery: {
      data: allEventsQuery.data,
      isLoading: allEventsQuery.isLoading,
      error: allEventsQuery.error,
    },
    allEvents: allEvents.map(event => ({
      id: event.id,
      hostUserId: event.hostUserId,
      status: event.status,
      isMyEvent: event.hostUserId === currentUser?.username,
    })),
  });

  const handleViewProfile = (userId: string) => {
    console.log('👤 Profile button clicked for user:', userId);
    setSelectedUserId(userId);
    setShowPublicProfile(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TonightLogo size="medium" />
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>
              Welcome, {currentUser?.username}!
              {(myEventsQuery.isFetching ||
                allEventsQuery.isFetching ||
                availableRequestsQuery.isFetching) &&
                ' 🔄'}
            </Text>
          </View>
        </View>

        {/* API Connection Status */}
        {(myEventsQuery.error || allEventsQuery.error) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ Unable to connect to server. Using offline mode.
            </Text>
          </View>
        )}

        {/* Upcoming Dates (Accepted Events) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Upcoming Dates {allEventsQuery.isFetching && '🔄'}
          </Text>
          {allEventsQuery.isLoading ? (
            <Text style={styles.loadingText}>Loading events...</Text>
          ) : upcomingEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {upcomingEvents.map((event: DateEvent) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>Date</Text>
                  <Text style={styles.eventDetail}>
                    Venue: {event.venue?.name || event.bar?.name || event.barId}
                  </Text>
                  <Text style={styles.eventDetail}>
                    Date: {event.eventDate} at {event.eventTime}
                  </Text>
                  <Text style={styles.eventDetail}>Status: {event.status}</Text>

                  {/* Show either accepted requester (if user is host) or host (if user is participant) */}
                  <View style={styles.hostInfo}>
                    {event.hostUserId === currentUser?.username ? (
                      // Current user is the host - show accepted requester
                      <>
                        <Text style={styles.eventDetail}>
                          Accepted:{' '}
                          {event.acceptedUser?.username || event.acceptedUserId}
                        </Text>
                        <TouchableOpacity
                          style={styles.profileButton}
                          onPress={() =>
                            handleViewProfile(event.acceptedUserId!)
                          }>
                          <Text style={styles.profileButtonText}>
                            View Profile
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      // Current user is the participant - show host
                      <>
                        <Text style={styles.eventDetail}>
                          Host: {event.hostUser?.username || event.hostUserId}
                        </Text>
                        <TouchableOpacity
                          style={styles.profileButton}
                          onPress={() => handleViewProfile(event.hostUserId)}>
                          <Text style={styles.profileButtonText}>
                            View Profile
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>
                You don&apos;t have any upcoming dates.
              </Text>
            </View>
          )}
        </View>

        {/* My Hosted Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            My Open Dates {myEventsQuery.isFetching && '🔄'}
          </Text>
          {myEventsQuery.isLoading ? (
            <Text style={styles.loadingText}>Loading events...</Text>
          ) : myHostedEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {myHostedEvents.map((event: DateEvent) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>Date</Text>
                  <Text style={styles.eventDetail}>
                    Venue: {event.venue?.name || event.bar?.name || event.barId}
                  </Text>
                  <Text style={styles.eventDetail}>
                    Date: {event.eventDate} at {event.eventTime}
                  </Text>
                  <Text style={styles.eventDetail}>Status: {event.status}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>
                You don&apos;t have any open dates right now.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Public Profile Modal */}
      <Modal
        visible={showPublicProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowPublicProfile(false);
          setSelectedUserId(null);
        }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Profile</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowPublicProfile(false);
                setSelectedUserId(null);
              }}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {profileLoading ? (
              <View style={styles.profileLoadingContainer}>
                <Text style={styles.loadingText}>Loading profile...</Text>
              </View>
            ) : profileError ? (
              <View style={styles.profileErrorContainer}>
                <Text style={styles.errorText}>Failed to load profile</Text>
              </View>
            ) : publicProfile ? (
              (() => {
                // Handle both wrapped and unwrapped API response formats
                const profileData = (publicProfile as any).data
                  ? (publicProfile as any).data
                  : publicProfile;

                return (
                  <>
                    <Text style={styles.profileUsername}>
                      {profileData.username}
                    </Text>

                    <View style={styles.profileInfo}>
                      {profileData.dob && (
                        <Text style={styles.profileAge}>
                          Age:{' '}
                          {new Date().getFullYear() -
                            new Date(profileData.dob).getFullYear()}{' '}
                          years old
                        </Text>
                      )}

                      {profileData.id && (
                        <Text style={styles.profileDetail}>
                          User ID: {profileData.id}
                        </Text>
                      )}

                      {profileData.gender && (
                        <Text style={styles.profileDetail}>
                          Gender:{' '}
                          {profileData.gender.charAt(0).toUpperCase() +
                            profileData.gender.slice(1)}
                        </Text>
                      )}

                      {profileData.orientation && (
                        <Text style={styles.profileDetail}>
                          Orientation:{' '}
                          {profileData.orientation.charAt(0).toUpperCase() +
                            profileData.orientation.slice(1)}
                        </Text>
                      )}
                    </View>

                    {profileData.promptAnswers &&
                      profileData.promptAnswers.length > 0 && (
                        <View style={styles.promptAnswersSection}>
                          <Text style={styles.promptAnswersTitle}>
                            Profile Questions
                          </Text>
                          {profileData.promptAnswers.map(
                            (answer: any, index: number) => (
                              <View key={index} style={styles.promptAnswer}>
                                <Text style={styles.promptQuestion}>
                                  Question {index + 1}
                                </Text>
                                <Text style={styles.promptAnswerText}>
                                  {answer.answer}
                                </Text>
                              </View>
                            )
                          )}
                        </View>
                      )}
                  </>
                );
              })()
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  errorText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },

  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  loadingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  noEventsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noEventsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  createEventButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createEventButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  findEventsButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findEventsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  profileButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  profileLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  profileErrorContainer: {
    backgroundColor: '#f8d7da',
    padding: 15,
    borderRadius: 8,
    margin: 20,
  },
  profileUsername: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  profileAge: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  profileDetail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  promptAnswersSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  promptAnswersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  promptAnswer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  promptAnswerText: {
    fontSize: 14,
    color: '#333',
  },
});

export default DashboardScreen;
