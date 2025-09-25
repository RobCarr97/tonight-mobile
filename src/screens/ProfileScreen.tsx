import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import TonightLogo from '../components/TonightLogo';
import { PROMPT_CATEGORIES } from '../constants/promptCategories';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services';
import { UpdateProfileRequest } from '../types';

const ProfileScreen: React.FC = () => {
  const { user, logout, deleteUser, updateUser } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    dob: '',
    gender: '' as 'male' | 'female' | 'non-binary' | 'other' | '',
    orientation: '' as
      | 'straight'
      | 'gay'
      | 'lesbian'
      | 'bisexual'
      | 'pansexual'
      | 'asexual'
      | 'other'
      | '',
    showGender: false,
    showOrientation: false,
  });

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No user data available</Text>
          <Text style={styles.debugText}>
            Please try logging out and logging back in.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle both wrapped and unwrapped user data formats
  const userData = (user as any).data ? (user as any).data : user;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString();
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return 'Not provided';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return `${age} years old`;
  };

  const getQuestionText = (categoryId: string, questionId: string) => {
    const category = PROMPT_CATEGORIES.find(
      (cat: any) => cat.id === categoryId
    );
    if (!category) return 'Unknown question';

    const question = category.questions.find((q: any) => q.id === questionId);
    return question ? question.question : 'Unknown question';
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteUser();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditProfile = () => {
    // Pre-populate edit form with current data
    setEditData({
      username: userData?.username || '',
      dob: userData?.dob || '',
      gender: userData?.gender || '',
      orientation: userData?.orientation || '',
      showGender: userData?.showGender || false,
      showOrientation: userData?.showOrientation || false,
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true);

      if (!userData?.id) {
        throw new Error('User ID not found');
      }

      // Create update payload with only changed fields
      const updatePayload: UpdateProfileRequest = {};

      if (editData.username && editData.username !== userData.username) {
        updatePayload.username = editData.username;
      }
      if (editData.dob && editData.dob !== userData.dob) {
        updatePayload.dob = editData.dob;
      }
      if (editData.gender && editData.gender !== userData.gender) {
        updatePayload.gender = editData.gender;
      }
      if (
        editData.orientation &&
        editData.orientation !== userData.orientation
      ) {
        updatePayload.orientation = editData.orientation;
      }
      if (editData.showGender !== userData.showGender) {
        updatePayload.showGender = editData.showGender;
      }
      if (editData.showOrientation !== userData.showOrientation) {
        updatePayload.showOrientation = editData.showOrientation;
      }

      // Only update if there are changes
      if (Object.keys(updatePayload).length > 0) {
        const updatedUser = await userService.updateProfile(
          userData.id,
          updatePayload
        );
        await updateUser(updatedUser);
        Alert.alert('Success', 'Profile updated successfully!');
      }

      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TonightLogo size="small" />
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.value}>
                {userData?.username || 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>{formatDate(userData?.dob)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Age</Text>
              <Text style={styles.value}>{calculateAge(userData?.dob)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>
                {userData?.gender || 'Not provided'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Sexual Orientation</Text>
              <Text style={styles.value}>
                {userData?.orientation || 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* Prompt Answers */}
        {userData?.promptAnswers && userData.promptAnswers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Questions</Text>
            {userData.promptAnswers.map((answer: any, index: number) => (
              <View key={index} style={styles.promptCard}>
                <Text style={styles.promptQuestion}>
                  {getQuestionText(answer.categoryId, answer.questionId)}
                </Text>
                <Text style={styles.promptAnswer}>{answer.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => setShowDeleteModal(true)}>
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Edit Profile Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEditModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Username</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.username}
                  onChangeText={text =>
                    setEditData({ ...editData, username: text })
                  }
                  placeholder="Enter username"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.formInput}
                  value={editData.dob}
                  onChangeText={text => setEditData({ ...editData, dob: text })}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Gender</Text>
                <View style={styles.pickerContainer}>
                  {['male', 'female', 'non-binary', 'other'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.pickerOption,
                        editData.gender === option &&
                          styles.pickerOptionSelected,
                      ]}
                      onPress={() =>
                        setEditData({ ...editData, gender: option as any })
                      }>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          editData.gender === option &&
                            styles.pickerOptionTextSelected,
                        ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.privacyToggle}
                  onPress={() =>
                    setEditData({
                      ...editData,
                      showGender: !editData.showGender,
                    })
                  }>
                  <Text style={styles.privacyLabel}>
                    {editData.showGender ? '✓' : '○'} Show gender publicly
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Orientation</Text>
                <View style={styles.pickerContainer}>
                  {[
                    'straight',
                    'gay',
                    'lesbian',
                    'bisexual',
                    'pansexual',
                    'asexual',
                    'other',
                  ].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.pickerOption,
                        editData.orientation === option &&
                          styles.pickerOptionSelected,
                      ]}
                      onPress={() =>
                        setEditData({ ...editData, orientation: option as any })
                      }>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          editData.orientation === option &&
                            styles.pickerOptionTextSelected,
                        ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.privacyToggle}
                  onPress={() =>
                    setEditData({
                      ...editData,
                      showOrientation: !editData.showOrientation,
                    })
                  }>
                  <Text style={styles.privacyLabel}>
                    {editData.showOrientation ? '✓' : '○'} Show orientation
                    publicly
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}>
                  <Text
                    style={[styles.actionButtonText, styles.cancelButtonText]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSaveProfile}
                  disabled={isUpdating}>
                  <Text
                    style={[styles.actionButtonText, styles.saveButtonText]}>
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <DeleteAccountModal
          visible={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          isDeleting={isDeleting}
        />
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
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'left',
    marginTop: 5,
    fontFamily: 'monospace',
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
    flex: 1,
    marginLeft: 10,
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
  promptQuestion: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    marginBottom: 8,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 25,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerOptionSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#666',
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  privacyToggle: {
    marginTop: 10,
    padding: 8,
  },
  privacyLabel: {
    fontSize: 14,
    color: '#666',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
    flex: 1,
  },
  cancelButtonText: {
    color: '#dc3545',
  },
  saveButton: {
    backgroundColor: '#007bff',
    flex: 1,
  },
  saveButtonText: {
    color: '#fff',
  },
});

export default ProfileScreen;
