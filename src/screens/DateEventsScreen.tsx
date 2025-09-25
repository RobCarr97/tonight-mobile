import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { dateEventService } from '../services';
import { DateEvent } from '../types';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'pending':
      return { backgroundColor: '#fff3cd' };
    case 'accepted':
      return { backgroundColor: '#d4edda' };
    case 'completed':
      return { backgroundColor: '#d1ecf1' };
    case 'expired':
      return { backgroundColor: '#f8d7da' };
    case 'declined':
      return { backgroundColor: '#f8d7da' };
    default:
      return { backgroundColor: '#e9ecef' };
  }
};

interface DateEventItemProps {
  event: DateEvent;
  onJoinRequest: (eventId: string) => void;
  isLoading: boolean;
  currentUserId?: string;
}

const DateEventItem: React.FC<DateEventItemProps> = ({
  event,
  onJoinRequest,
  isLoading,
  currentUserId,
}) => {
  console.log('DateEventItem - Rendering event:', event.id);
  console.log('DateEventItem - Event data:', {
    hostUserId: event.hostUserId,
    currentUserId: currentUserId,
    isMyEvent: event.hostUserId === currentUserId,
    status: event.status,
    isOpen: event.isOpen,
    acceptedUserId: event.acceptedUserId,
    venueName: event.venue?.name || event.bar?.name,
  });
  const formatDateTime = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return (
        dateTime.toLocaleDateString() +
        ' at ' +
        dateTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      return `${date} at ${time}`;
    }
  };

  const canJoin =
    event.isOpen &&
    event.hostUserId !== currentUserId &&
    !event.acceptedUserId &&
    event.status === 'open';

  const isMyEvent = event.hostUserId === currentUserId;

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>Date Event</Text>
        <View style={[styles.statusBadge, getStatusStyle(event.status)]}>
          <Text style={styles.statusText}>{event.status}</Text>
        </View>
      </View>

      <View style={styles.eventDetails}>
        <Text style={styles.eventDateTime}>
          📅 {formatDateTime(event.eventDate, event.eventTime)}
        </Text>

        <Text style={styles.eventVenue}>
          📍{' '}
          {event.venue?.name || event.bar?.name || `Venue ID: ${event.barId}`}
        </Text>

        {(event.venue?.address || event.bar?.address) && (
          <Text style={styles.eventAddress}>
            {event.venue?.address || event.bar?.address}
          </Text>
        )}

        <Text style={styles.eventHost}>
          👤 Host: {event.hostUser?.username || event.hostUserId}
        </Text>

        {event.acceptedUser && (
          <Text style={styles.eventGuest}>
            ✅ Guest: {event.acceptedUser.username}
          </Text>
        )}
      </View>

      <View style={styles.eventActions}>
        {isMyEvent && (
          <View style={styles.myEventBadge}>
            <Text style={styles.myEventText}>Your Event</Text>
          </View>
        )}

        {canJoin && (
          <TouchableOpacity
            style={[styles.joinButton, isLoading && styles.disabledButton]}
            onPress={() => onJoinRequest(event.id)}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.joinButtonText}>Request to Join</Text>
            )}
          </TouchableOpacity>
        )}

        {!event.isOpen && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Event Closed</Text>
          </View>
        )}
      </View>

      <View style={styles.eventMeta}>
        <Text style={styles.eventMetaText}>
          Created: {new Date(event.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

export default function DateEventsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'attending' | 'all'>('attending');

  console.log('DateEventsScreen - Current user:', user);
  console.log('DateEventsScreen - Active tab:', activeTab);
  console.log('DateEventsScreen - User enabled check:', !!user?.username);

  // Get all events (for browsing)
  const allEventsQuery = useQuery({
    queryKey: ['dateEvents'],
    queryFn: async () => {
      const events = await dateEventService.getDateEvents();
      console.log('All events loaded:', events.length, events);
      return events;
    },
    enabled: true, // Always enabled so we can debug
    refetchInterval: 30000,
  });

  // Get events where user is involved (both hosting and accepted to join)
  const attendingEventsQuery = useQuery({
    queryKey: ['attendingEvents', user?.username],
    queryFn: async () => {
      console.log('Fetching attending events for user:', user?.username);
      const allEvents = await dateEventService.getDateEvents();
      console.log('All events received:', allEvents.length);

      const relevantEvents = allEvents.filter(event => {
        const isHosting =
          event.hostUserId === user?.username ||
          (event as any).HostUserId === user?.username;
        const isAcceptedGuest = event.acceptedUserId === user?.username;
        const isRelevant = isHosting || isAcceptedGuest;

        console.log(
          'Event',
          event.id,
          '- hostUserId:',
          event.hostUserId,
          '- acceptedUserId:',
          event.acceptedUserId,
          '- user:',
          user?.username
        );
        console.log(
          '  isHosting:',
          isHosting,
          '- isAcceptedGuest:',
          isAcceptedGuest,
          '- isRelevant:',
          isRelevant
        );

        return isRelevant;
      });

      console.log(
        'Relevant events for',
        user?.username,
        ':',
        relevantEvents.length,
        relevantEvents
      );
      return relevantEvents;
    },
    enabled: !!user?.username && activeTab === 'attending',
    refetchInterval: 30000,
  });

  // Get the current query based on active tab
  const getCurrentQuery = () => {
    switch (activeTab) {
      case 'attending':
        return attendingEventsQuery;
      case 'all':
        return allEventsQuery;
      default:
        return attendingEventsQuery;
    }
  };

  const currentQuery = getCurrentQuery();

  console.log('=== DETAILED QUERY DEBUG ===');
  console.log('Active tab:', activeTab);
  console.log(
    'Current query is attendingEventsQuery:',
    currentQuery === attendingEventsQuery
  );
  console.log(
    'Current query is allEventsQuery:',
    currentQuery === allEventsQuery
  );

  console.log('Current query state:', {
    activeTab,
    isLoading: currentQuery.isLoading,
    isError: currentQuery.isError,
    data: currentQuery.data,
    dataLength: currentQuery.data?.length,
    error: currentQuery.error,
  });

  // Additional debugging for render data
  console.log('Data being passed to FlatList:', currentQuery.data || []);
  console.log('FlatList data length:', (currentQuery.data || []).length);

  // Show loading only if we're actually loading and don't have any data yet
  const isActuallyLoading = currentQuery.isLoading && !currentQuery.data;

  // Join event mutation
  const joinEventMutation = useMutation({
    mutationFn: (eventId: string) =>
      dateEventService.requestToJoinDateEvent({
        dateEventId: eventId,
        requesterId: user?.username || '',
      }),
    onSuccess: () => {
      // Invalidate all event queries
      queryClient.invalidateQueries({ queryKey: ['dateEvents'] });
      queryClient.invalidateQueries({ queryKey: ['myEvents'] });
      queryClient.invalidateQueries({ queryKey: ['attendingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['dateRequests'] });
      Alert.alert(
        'Success',
        'Your request to join has been sent! The host will be notified.'
      );
    },
    onError: (error: any) => {
      console.error('Failed to request to join event:', error);
      Alert.alert('Error', error.message || 'Failed to send request');
    },
  });

  const handleJoinRequest = (eventId: string) => {
    if (!user?.username) {
      Alert.alert('Error', 'Please log in to join events');
      return;
    }

    Alert.alert('Join Event', 'Send a request to join this date event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Request',
        onPress: () => joinEventMutation.mutate(eventId),
      },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh all queries
      await Promise.all([
        attendingEventsQuery.refetch(),
        allEventsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToCreateEvent = () => {
    router.push('/(tabs)/create');
  };

  const renderEventItem = ({ item }: { item: DateEvent }) => {
    console.log(
      'Rendering event item:',
      item.id,
      item.venue?.name || item.bar?.name
    );
    return (
      <DateEventItem
        event={item}
        onJoinRequest={handleJoinRequest}
        isLoading={joinEventMutation.isPending}
        currentUserId={user?.username}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Date Events</Text>
      <Text style={styles.emptyText}>Be the first to create a date event!</Text>
      <TouchableOpacity
        style={styles.createFirstButton}
        onPress={navigateToCreateEvent}>
        <Text style={styles.createFirstButtonText}>Create First Event</Text>
      </TouchableOpacity>
    </View>
  );

  if (isActuallyLoading) {
    console.log('Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Date Events</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={navigateToCreateEvent}>
          <Text style={styles.createButtonText}>+ Create Event</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attending' && styles.activeTab]}
          onPress={() => setActiveTab('attending')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'attending' && styles.activeTabText,
            ]}>
            My Events ({attendingEventsQuery.data?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'all' && styles.activeTabText,
            ]}>
            Browse All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info - Temporary */}
      <View style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 10 }}>
        <Text style={{ fontSize: 12 }}>DEBUG INFO:</Text>
        <Text style={{ fontSize: 10 }}>
          User: {JSON.stringify(user?.username)}
        </Text>
        <Text style={{ fontSize: 10 }}>Active Tab: {activeTab}</Text>
        <Text style={{ fontSize: 10 }}>
          Current Query Loading: {currentQuery.isLoading.toString()}
        </Text>
        <Text style={{ fontSize: 10 }}>
          Current Query Error:{' '}
          {currentQuery.error ? currentQuery.error.message : 'none'}
        </Text>
        <Text style={{ fontSize: 10 }}>
          Current Query Data Length: {currentQuery.data?.length || 'undefined'}
        </Text>
        <Text style={{ fontSize: 10 }}>
          All Events Length: {allEventsQuery.data?.length || 'undefined'}
        </Text>
      </View>

      {currentQuery.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load events</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => currentQuery.refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={currentQuery.data || []}
        renderItem={renderEventItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={!currentQuery.isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#721c24',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status_pending: {
    backgroundColor: '#fff3cd',
  },
  status_accepted: {
    backgroundColor: '#d4edda',
  },
  status_completed: {
    backgroundColor: '#d1ecf1',
  },
  status_expired: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventDateTime: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  eventVenue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  eventAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginLeft: 16,
  },
  eventHost: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventGuest: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  myEventBadge: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  myEventText: {
    color: '#0066cc',
    fontWeight: '600',
    fontSize: 12,
  },
  joinButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  closedBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  closedText: {
    color: '#6c757d',
    fontWeight: '500',
    fontSize: 12,
  },
  eventMeta: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
  },
  eventMetaText: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  createFirstButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createFirstButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
