import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No user data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const formatGender = (gender: string): string => {
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  const formatOrientation = (orientation: string): string => {
    return orientation.charAt(0).toUpperCase() + orientation.slice(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.value}>{user.username}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>

            {user.dob && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Age</Text>
                <Text style={styles.value}>
                  {calculateAge(user.dob)} years old
                </Text>
              </View>
            )}

            {user.gender && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Gender</Text>
                <View style={{flexDirection: 'column', alignItems: 'flex-end', flex: 1}}>
                  <Text style={styles.value}>{formatGender(user.gender)}</Text>
                  <Text style={{fontSize: 12, marginTop: 4, color: user.showGender ? '#28a745' : '#dc3545'}}>
                    {user.showGender ? '👁 Public' : '🔒 Private'}
                  </Text>
                </View>
              </View>
            )}

            {user.orientation && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Orientation</Text>
                <View style={{flexDirection: 'column', alignItems: 'flex-end', flex: 1}}>
                  <Text style={styles.value}>
                    {formatOrientation(user.orientation)}
                  </Text>
                  <Text style={{fontSize: 12, marginTop: 4, color: user.showOrientation ? '#28a745' : '#dc3545'}}>
                    {user.showOrientation ? '👁 Public' : '🔒 Private'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Prompt Answers */}
        {user.promptAnswers && user.promptAnswers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>

            {user.promptAnswers.map((answer, index) => (
              <View
                key={`${answer.categoryId}-${answer.questionId}-${index}`}
                style={styles.promptCard}>
                <Text style={styles.promptAnswer}>{answer.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('edit-profile' as any)}
          >
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Privacy Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={logout}>
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              Sign Out
            </Text>
          </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
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
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
  },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  promptAnswer: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  dangerButtonText: {
    color: '#dc3545',
  },
});

export default ProfileScreen;
