import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { dateEventService } from '../../src/services';
import { DateEvent } from '../../src/types';

const DashboardScreen: React.FC = () => {
  const { user: currentUser, logout } = useAuth();

  // Get user's created events using the proper API endpoint
  const myEventsQuery = useQuery({
    queryKey: ['userEvents', currentUser?.username],
    queryFn: () => {
      return dateEventService.getUserEvents(currentUser!.username);
    },
    enabled: !!currentUser?.username,
    retry: 1, // Reduce retries to fail faster
    staleTime: 1000 * 60, // 1 minute
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
    staleTime: 1000 * 60, // 1 minute
  });

  // Get events from proper API endpoints
  const myEvents =
    (myEventsQuery.data as any)?.data || myEventsQuery.data || [];
  const allEventsData = allEventsQuery.data || [];

  console.log('Dashboard data processing:', {
    currentUsername: currentUser?.username,
    myEventsLength: myEvents.length,
    myEventsQuery: {
      isLoading: myEventsQuery.isLoading,
      isError: myEventsQuery.isError,
      error: myEventsQuery.error,
      data: myEventsQuery.data,
    },
  });

  // Ensure we have an array to work with
  const allEvents = Array.isArray(allEventsData) ? allEventsData : [];

  // Joined Events are those where I was accepted to join (acceptedUserId matches my username)
  const joinedEvents = allEvents.filter(
    event => event.acceptedUserId === currentUser?.username
  );

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled by the auth state change
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tonight</Text>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>
              Welcome, {currentUser?.username}!
            </Text>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
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

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{myEvents.length}</Text>
            <Text style={styles.statLabel}>My Events</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{joinedEvents.length}</Text>
            <Text style={styles.statLabel}>Joined Events</Text>
          </View>
        </View>

        {/* Recent Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Recent Events</Text>
          {myEventsQuery.isLoading ? (
            <Text style={styles.loadingText}>Loading events...</Text>
          ) : myEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {myEvents.slice(0, 3).map((event: DateEvent) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>Date Event</Text>
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
                You haven&apos;t created any events yet.
              </Text>
              <TouchableOpacity style={styles.createEventButton}>
                <Text style={styles.createEventButtonText}>
                  Create your first event
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Events I'm Attending */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events I&apos;m Attending</Text>
          {allEventsQuery.isLoading ? (
            <Text style={styles.loadingText}>Loading events...</Text>
          ) : joinedEvents.length > 0 ? (
            <View style={styles.eventsList}>
              {joinedEvents.slice(0, 3).map((event: DateEvent) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>Date Event</Text>
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
                You&apos;re not attending any events yet.
              </Text>
              <TouchableOpacity style={styles.findEventsButton}>
                <Text style={styles.findEventsButtonText}>
                  Find events to join
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
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
});

export default DashboardScreen;
