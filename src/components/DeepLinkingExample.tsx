import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

/**
 * Example component demonstrating how to use deep linking to navigate to EditProfileScreen
 * with pre-populated values from URL parameters
 */
const DeepLinkingExample: React.FC = () => {
  const navigateToEditProfileWithParams = () => {
    // Example: Navigate to edit profile with specific values
    // This simulates what would happen if a user clicked a link like:
    // tonight://edit-profile?username=johndoe&gender=male&showGender=true&showOrientation=false
    
    router.push({
      pathname: 'edit-profile' as any,
      params: {
        username: 'johndoe',
        gender: 'male',
        orientation: 'straight',
        showGender: 'true',
        showOrientation: 'false',
        dob: '1990-05-15'
      }
    });
  };

  const navigateToEditProfileWithPrivacyUpdate = () => {
    // Example: Navigate to edit profile to update privacy settings only
    router.push({
      pathname: 'edit-profile' as any,
      params: {
        showGender: 'true',
        showOrientation: 'true'
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deep Linking Examples</Text>
      <Text style={styles.description}>
        These buttons demonstrate how to navigate to the EditProfileScreen with 
        pre-populated values using deep linking parameters.
      </Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={navigateToEditProfileWithParams}
      >
        <Text style={styles.buttonText}>
          Edit Profile with Full Data
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={navigateToEditProfileWithPrivacyUpdate}
      >
        <Text style={styles.buttonText}>
          Update Privacy Settings Only
        </Text>
      </TouchableOpacity>

      <View style={styles.urlExamples}>
        <Text style={styles.sectionTitle}>Example Deep Link URLs:</Text>
        <Text style={styles.urlText}>
          • tonight://edit-profile?username=johndoe&gender=male&showGender=true
        </Text>
        <Text style={styles.urlText}>
          • tonight://edit-profile?showGender=true&showOrientation=false
        </Text>
        <Text style={styles.urlText}>
          • tonight://edit-profile?dob=1990-05-15&orientation=bisexual
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  urlExamples: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  urlText: {
    fontSize: 12,
    color: '#495057',
    fontFamily: 'monospace',
    marginBottom: 5,
  },
});

export default DeepLinkingExample;