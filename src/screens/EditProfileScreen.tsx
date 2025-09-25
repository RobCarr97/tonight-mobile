import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services';
import { Gender, Orientation, UpdateProfileRequest, UserPromptAnswer } from '../types';
import { PROMPT_CATEGORIES } from '../constants/promptCategories';

interface EditProfileData {
  dob: string;
  gender: Gender;
  orientation: Orientation;
  showGender: boolean;
  showOrientation: boolean;
  promptAnswers: UserPromptAnswer[];
}

const EditProfileScreen: React.FC = () => {
  const { user, updateUser } = useAuth();
  const params = useLocalSearchParams();
  
  const [formData, setFormData] = useState<EditProfileData>({
    dob: user?.dob || '',
    gender: user?.gender || 'other',
    orientation: user?.orientation || 'other',
    showGender: user?.showGender || false,
    showOrientation: user?.showOrientation || false,
    promptAnswers: user?.promptAnswers || [],
  });

  const [errors, setErrors] = useState<Partial<EditProfileData>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dob ? new Date(user.dob) : new Date()
  );

  // Update form when user data changes (useful for deep linking)
  useEffect(() => {
    if (user) {
      setFormData({
        dob: user.dob || '',
        gender: user.gender || 'other',
        orientation: user.orientation || 'other',
        showGender: user.showGender || false,
        showOrientation: user.showOrientation || false,
        promptAnswers: user.promptAnswers || [],
      });
      if (user.dob) {
        setDateOfBirth(new Date(user.dob));
      }
    }
  }, [user]);

  // Handle URL parameters for deep linking
  useEffect(() => {
    if (params && user) {
      setFormData(prevFormData => {
        const updatedFormData = { ...prevFormData };
        let hasChanges = false;
        
        if (params.gender && typeof params.gender === 'string') {
          updatedFormData.gender = params.gender as Gender;
          hasChanges = true;
        }
        
        if (params.orientation && typeof params.orientation === 'string') {
          updatedFormData.orientation = params.orientation as Orientation;
          hasChanges = true;
        }
        
        if (params.showGender !== undefined) {
          const showGenderValue = Array.isArray(params.showGender) ? params.showGender[0] : params.showGender;
          updatedFormData.showGender = showGenderValue === 'true';
          hasChanges = true;
        }
        
        if (params.showOrientation !== undefined) {
          const showOrientationValue = Array.isArray(params.showOrientation) ? params.showOrientation[0] : params.showOrientation;
          updatedFormData.showOrientation = showOrientationValue === 'true';
          hasChanges = true;
        }
        
        if (params.dob && typeof params.dob === 'string') {
          updatedFormData.dob = params.dob;
          setDateOfBirth(new Date(params.dob));
          hasChanges = true;
        }

        return hasChanges ? updatedFormData : prevFormData;
      });
    }
  }, [params, user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      const updatedUser = await userService.updateProfile(user.id, data);
      return updatedUser;
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Profile update failed';
      Alert.alert('Update Failed', errorMessage);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<EditProfileData> = {};

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    } else {
      // Validate that user is 18+
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      if (age < 18) {
        newErrors.dob = 'You must be at least 18 years old';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const updateData: UpdateProfileRequest = {
      dob: formData.dob,
      gender: formData.gender,
      orientation: formData.orientation,
      showGender: formData.showGender,
      showOrientation: formData.showOrientation,
      promptAnswers: formData.promptAnswers,
    };

    updateProfileMutation.mutate(updateData);
  };

  const handleInputChange = (
    field: keyof EditProfileData,
    value: string | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      handleInputChange('dob', formattedDate);
    }
  };

  const showDateSelector = () => {
    setShowDatePicker(true);
  };

  const handlePromptAnswerChange = (categoryId: string, questionId: string, answer: string) => {
    setFormData(prevData => {
      const updatedPromptAnswers = [...prevData.promptAnswers];
      const existingAnswerIndex = updatedPromptAnswers.findIndex(
        (promptAnswer) => promptAnswer.categoryId === categoryId && promptAnswer.questionId === questionId
      );

      if (existingAnswerIndex >= 0) {
        // Update existing answer
        updatedPromptAnswers[existingAnswerIndex] = {
          ...updatedPromptAnswers[existingAnswerIndex],
          answer,
        };
      } else {
        // Add new answer
        updatedPromptAnswers.push({
          categoryId,
          questionId,
          answer,
        });
      }

      return {
        ...prevData,
        promptAnswers: updatedPromptAnswers,
      };
    });
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {/* Show username (read-only) */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <View style={[styles.input, styles.readOnlyInput]}>
                  <Text style={styles.readOnlyText}>{user?.username}</Text>
                </View>
              </View>

              {/* Date of Birth */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                  style={[styles.input, errors.dob && styles.inputError]}
                  onPress={showDateSelector}>
                  <Text
                    style={[
                      styles.dateText,
                      !formData.dob && styles.placeholderText,
                    ]}>
                    {formData.dob
                      ? `${formData.dob} (${calculateAge(formData.dob)} years old)`
                      : 'Select date of birth'}
                  </Text>
                </TouchableOpacity>
                {errors.dob && (
                  <Text style={styles.errorText}>{errors.dob}</Text>
                )}

                {showDatePicker && (
                  <DateTimePicker
                    value={dateOfBirth}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1900, 0, 1)}
                  />
                )}
              </View>

              {/* Gender */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.gender === 'male' && styles.selectedPicker,
                    ]}
                    onPress={() => handleInputChange('gender', 'male')}>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.gender === 'male' &&
                          styles.selectedPickerText,
                      ]}>
                      Male
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.gender === 'female' && styles.selectedPicker,
                    ]}
                    onPress={() => handleInputChange('gender', 'female')}>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.gender === 'female' &&
                          styles.selectedPickerText,
                      ]}>
                      Female
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.gender === 'non-binary' &&
                        styles.selectedPicker,
                    ]}
                    onPress={() => handleInputChange('gender', 'non-binary')}>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.gender === 'non-binary' &&
                          styles.selectedPickerText,
                      ]}>
                      Non-binary
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.gender === 'other' && styles.selectedPicker,
                    ]}
                    onPress={() => handleInputChange('gender', 'other')}>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.gender === 'other' &&
                          styles.selectedPickerText,
                      ]}>
                      Other
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Gender Privacy Toggle */}
              <View style={styles.privacyToggleContainer}>
                <View style={styles.privacyToggleRow}>
                  <View style={styles.privacyToggleText}>
                    <Text style={styles.privacyToggleLabel}>
                      Make gender public
                    </Text>
                    <Text style={styles.privacyToggleSubtext}>
                      {formData.showGender
                        ? '👁 Other users can see your gender'
                        : '🔒 Only you can see your gender'}
                    </Text>
                  </View>
                  <Switch
                    value={formData.showGender}
                    onValueChange={value =>
                      handleInputChange('showGender', value)
                    }
                    trackColor={{ false: '#e1e1e1', true: '#007AFF' }}
                    thumbColor={formData.showGender ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Orientation */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Orientation</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.orientation === 'straight' &&
                        styles.selectedPicker,
                    ]}
                    onPress={() =>
                      handleInputChange('orientation', 'straight')
                    }>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.orientation === 'straight' &&
                          styles.selectedPickerText,
                      ]}>
                      Straight
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.orientation === 'gay' && styles.selectedPicker,
                    ]}
                    onPress={() => handleInputChange('orientation', 'gay')}>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.orientation === 'gay' &&
                          styles.selectedPickerText,
                      ]}>
                      Gay
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.orientation === 'lesbian' &&
                        styles.selectedPicker,
                    ]}
                    onPress={() => handleInputChange('orientation', 'lesbian')}>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.orientation === 'lesbian' &&
                          styles.selectedPickerText,
                      ]}>
                      Lesbian
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.orientation === 'bisexual' &&
                        styles.selectedPicker,
                    ]}
                    onPress={() =>
                      handleInputChange('orientation', 'bisexual')
                    }>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.orientation === 'bisexual' &&
                          styles.selectedPickerText,
                      ]}>
                      Bisexual
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.orientation === 'pansexual' &&
                        styles.selectedPicker,
                    ]}
                    onPress={() =>
                      handleInputChange('orientation', 'pansexual')
                    }>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.orientation === 'pansexual' &&
                          styles.selectedPickerText,
                      ]}>
                      Pansexual
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.orientation === 'asexual' &&
                        styles.selectedPicker,
                    ]}
                    onPress={() =>
                      handleInputChange('orientation', 'asexual')
                    }>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.orientation === 'asexual' &&
                          styles.selectedPickerText,
                      ]}>
                      Asexual
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      formData.orientation === 'other' &&
                        styles.selectedPicker,
                    ]}
                    onPress={() => handleInputChange('orientation', 'other')}>
                    <Text
                      style={[
                        styles.pickerText,
                        formData.orientation === 'other' &&
                          styles.selectedPickerText,
                      ]}>
                      Other
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Orientation Privacy Toggle */}
              <View style={styles.privacyToggleContainer}>
                <View style={styles.privacyToggleRow}>
                  <View style={styles.privacyToggleText}>
                    <Text style={styles.privacyToggleLabel}>
                      Make orientation public
                    </Text>
                    <Text style={styles.privacyToggleSubtext}>
                      {formData.showOrientation
                        ? '👁 Other users can see your orientation'
                        : '🔒 Only you can see your orientation'}
                    </Text>
                  </View>
                  <Switch
                    value={formData.showOrientation}
                    onValueChange={value =>
                      handleInputChange('showOrientation', value)
                    }
                    trackColor={{ false: '#e1e1e1', true: '#007AFF' }}
                    thumbColor={
                      formData.showOrientation ? '#ffffff' : '#f4f3f4'
                    }
                  />
                </View>
              </View>

              {/* Prompt Answers Section */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>About Me</Text>
                <Text style={styles.sectionSubtitle}>
                  Edit your prompt answers to help others get to know you better
                </Text>
                
                {PROMPT_CATEGORIES.map((category) => (
                  <View key={category.id} style={styles.categoryContainer}>
                    <Text style={styles.categoryTitle}>{category.name}</Text>
                    {category.questions.map((question) => {
                      const existingAnswer = formData.promptAnswers.find(
                        (answer) => answer.categoryId === category.id && answer.questionId === question.id
                      );
                      
                      return (
                        <View key={question.id} style={styles.promptContainer}>
                          <Text style={styles.promptQuestion}>{question.question}</Text>
                          <TextInput
                            style={styles.promptInput}
                            placeholder="Your answer..."
                            value={existingAnswer?.answer || ''}
                            onChangeText={(text) => handlePromptAnswerChange(category.id, question.id, text)}
                            multiline
                            numberOfLines={3}
                            maxLength={200}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  updateProfileMutation.isPending && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}>
                <Text style={styles.saveButtonText}>
                  {updateProfileMutation.isPending
                    ? 'Saving...'
                    : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
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
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 5,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedPicker: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedPickerText: {
    color: '#fff',
  },
  privacyToggleContainer: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
  },
  privacyToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyToggleText: {
    flex: 1,
    marginRight: 15,
  },
  privacyToggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  privacyToggleSubtext: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  readOnlyText: {
    color: '#666',
    fontSize: 16,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  promptContainer: {
    marginBottom: 16,
  },
  promptQuestion: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
});

export default EditProfileScreen;