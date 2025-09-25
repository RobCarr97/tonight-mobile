import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { dateEventService } from '../../src/services';
import { DateRequest } from '../../src/types';

const RequestsScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Debug logging
  console.log('RequestsScreen - Current user:', user);
  console.log('RequestsScreen - User username:', user?.username);
  console.log('RequestsScreen - User enabled check:', !!user?.username);

  // Fetch incoming requests for events I'm hosting
  const {
    data: incomingRequests = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['incomingRequests', user?.username],
    queryFn: () =>
      dateEventService.getIncomingDateRequests(user?.username || ''),
    enabled: !!user?.username,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for responding to requests
  const respondMutation = useMutation({
    mutationFn: ({
      requestId,
      accept,
    }: {
      requestId: string;
      accept: boolean;
    }) => dateEventService.respondToDateRequest(requestId, { accept }),
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ['incomingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['dateEvents'] });
      Alert.alert(
        'Success',
        `Request ${accept ? 'accepted' : 'declined'} successfully!`
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to respond to request');
    },
  });

  const handleResponse = (requestId: string, accept: boolean) => {
    const action = accept ? 'accept' : 'decline';
    Alert.alert(
      `${accept ? 'Accept' : 'Decline'} Request`,
      `Are you sure you want to ${action} this date request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: accept ? 'Accept' : 'Decline',
          style: accept ? 'default' : 'destructive',
          onPress: () => respondMutation.mutate({ requestId, accept }),
        },
      ]
    );
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date}T${time}`);
      return (
        dateTime.toLocaleDateString() +
        ' at ' +
        dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return `${date} at ${time}`;
    }
  };

  const renderRequestItem = ({ item }: { item: DateRequest }) => {
    const event = item.dateEvent;
    const venueName = event?.venue?.name || event?.bar?.name || 'Unknown Venue';

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requesterName}>
            From: {item.requester?.username || `User ${item.requesterUserId}`}
          </Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.venueName}>{venueName}</Text>
        {event && (
          <Text style={styles.eventTime}>
            {formatDateTime(event.eventDate, event.eventTime)}
          </Text>
        )}

        <Text style={styles.requestTime}>
          Requested: {new Date(item.requestedAt).toLocaleDateString()}
        </Text>

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleResponse(item.id, true)}
              disabled={respondMutation.isPending}>
              {respondMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleResponse(item.id, false)}
              disabled={respondMutation.isPending}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'accepted':
        return styles.acceptedStatus;
      case 'declined':
        return styles.declinedStatus;
      default:
        return styles.pendingStatus;
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Please log in to view requests</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>Error loading requests</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Date Requests</Text>
        <Text style={styles.subtitle}>
          {incomingRequests.length} request
          {incomingRequests.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={incomingRequests}
        keyExtractor={item => item.id}
        renderItem={renderRequestItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#007bff']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No incoming requests</Text>
            <Text style={styles.emptySubtext}>
              Requests for your date events will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 15,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pendingStatus: {
    backgroundColor: '#fff3cd',
  },
  acceptedStatus: {
    backgroundColor: '#d1edff',
  },
  declinedStatus: {
    backgroundColor: '#f8d7da',
  },
  venueName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007bff',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  requestTime: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  declineButton: {
    backgroundColor: '#dc3545',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default RequestsScreen;
