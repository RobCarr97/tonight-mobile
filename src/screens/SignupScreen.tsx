import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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

import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';
import { validatePassword } from '../utils/passwordValidation';

interface UserPromptAnswer {
  categoryId: string;
  questionId: string;
  answer: string;
}

// TypeScript interfaces for prompt answer system
interface PromptCategory {
  id: string;
  name: string;
  description: string;
  questions: PromptQuestion[];
}

interface PromptQuestion {
  id: string;
  question: string;
  categoryId?: string; // Added when extracted from categories
}

interface SignupData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  dob: string;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  orientation:
    | 'straight'
    | 'gay'
    | 'lesbian'
    | 'bisexual'
    | 'pansexual'
    | 'asexual'
    | 'other';
  showGender: boolean;
  showOrientation: boolean;
}

const SignupScreen: React.FC = () => {
  const { signup } = useAuth();

  const [formData, setFormData] = useState<SignupData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'other',
    orientation: 'other',
    showGender: false, // Default to private
    showOrientation: false, // Default to private
  });
  const [errors, setErrors] = useState<Partial<SignupData>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Default to 18 years ago from today (minimum age requirement)
  const today = new Date();
  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );
  const [dateOfBirth, setDateOfBirth] = useState(eighteenYearsAgo);

  // Prompt answers state for prompt collection during signup
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>(
    []
  );
  const [selectedAnswers, setSelectedAnswers] = useState<UserPromptAnswer[]>(
    []
  );
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<PromptCategory | null>(null);
  const [selectedQuestion, setSelectedQuestion] =
    useState<PromptQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');

  // API functions for fetching prompt data
  const fetchPromptCategories = async (): Promise<PromptCategory[]> => {
    try {
      // Fetch categories from the /prompts/categories endpoint
      const response: any = await apiClient.get('/prompts/categories');
      const categories = response.data || response;
      return categories as PromptCategory[];
    } catch (error) {
      console.error('Error fetching prompt categories:', error);
      return [];
    }
  };

  // Load prompt categories on component mount
  useEffect(() => {
    const loadPromptData = async () => {
      setLoadingPrompts(true);
      try {
        const categories = await fetchPromptCategories();
        setPromptCategories(categories);
      } catch (error) {
        console.error('Error loading prompt categories:', error);
      } finally {
        setLoadingPrompts(false);
      }
    };

    loadPromptData();
  }, []);

  // Helper functions for managing prompt answers
  const handleAnswerChange = (
    categoryId: string,
    questionId: string,
    answer: string
  ) => {
    setSelectedAnswers(prev => {
      // Remove existing answer for this question
      const filtered = prev.filter(
        a => !(a.categoryId === categoryId && a.questionId === questionId)
      );

      // Add new answer if not empty (preserve internal spaces, only trim for validation)
      if (answer.trim()) {
        return [...filtered, { categoryId, questionId, answer: answer }]; // Keep original answer with spaces
      }

      return filtered;
    });
  };

  const handleQuestionSelect = (
    category: PromptCategory,
    question: PromptQuestion
  ) => {
    setSelectedCategory(category);
    setSelectedQuestion(question);
    setCurrentAnswer('');
  };

  const handleAnswerSubmit = (answer: string) => {
    if (selectedCategory && selectedQuestion && answer.trim()) {
      handleAnswerChange(selectedCategory.id, selectedQuestion.id, answer);
      setShowQuestionModal(false);
      setSelectedCategory(null);
      setSelectedQuestion(null);
      setCurrentAnswer('');
    }
  };

  const closeModal = () => {
    setShowQuestionModal(false);
    setSelectedCategory(null);
    setSelectedQuestion(null);
    setCurrentAnswer('');
  };

  const removeAnswer = (categoryId: string, questionId: string) => {
    setSelectedAnswers(prev =>
      prev.filter(
        a => !(a.categoryId === categoryId && a.questionId === questionId)
      )
    );
  };

  const signupMutation = useMutation({
    mutationFn: async (data: Omit<SignupData, 'confirmPassword'>) => {
      // Create user and automatically log them in
      const profileData = {
        username: data.username,
        email: data.email,
        password: data.password,
        dob: data.dob, // Should be in YYYY-MM-DD format
        gender: data.gender,
        orientation: data.orientation,
        showGender: data.showGender,
        showOrientation: data.showOrientation,
        promptAnswers: selectedAnswers, // Include user's prompt answers
      };

      // Log the request but mask the password
      console.log('Creating user with data:', {
        ...profileData,
        password: '***MASKED***',
      });

      // Use the signup function from AuthContext which will create the user and log them in
      await signup(profileData);
    },
    onSuccess: () => {
      Alert.alert(
        'Account Created Successfully!',
        "Welcome to Tonight! Your account has been created and you're automatically logged in.",
        [
          {
            text: 'Go to Dashboard',
            onPress: () => router.replace('/(tabs)'), // Go to main dashboard/tabs
          },
        ]
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Signup failed';
      Alert.alert('Signup Failed', errorMessage);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupData> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors.join(', ');
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    } else {
      // Validate date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.dob)) {
        newErrors.dob = 'Please enter date in YYYY-MM-DD format';
      } else {
        // Validate that it's a real date and user is 18+
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
    }

    // Validate prompt answers - minimum 3 required (skip if prompts failed to load)
    if (promptCategories.length > 0 && selectedAnswers.length < 3) {
      Alert.alert(
        'Profile Incomplete',
        'Please answer at least 3 profile prompts to help others get to know you better.'
      );
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    const { confirmPassword, ...signupData } = formData;
    signupMutation.mutate(signupData);
  };

  const handleInputChange = (
    field: keyof SignupData,
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join us and start your journey
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  placeholder="Username"
                  value={formData.username}
                  onChangeText={text => handleInputChange('username', text)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.username && (
                  <Text style={styles.errorText}>{errors.username}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Email"
                  value={formData.email}
                  onChangeText={text =>
                    handleInputChange('email', text.toLowerCase())
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Password"
                  value={formData.password}
                  onChangeText={text => handleInputChange('password', text)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
                <PasswordStrengthIndicator
                  password={formData.password}
                  showRequirements={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    errors.confirmPassword && styles.inputError,
                  ]}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={text =>
                    handleInputChange('confirmPassword', text)
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.datePickerButton,
                    errors.dob && styles.inputError,
                  ]}
                  onPress={showDateSelector}>
                  <Text
                    style={[
                      styles.datePickerText,
                      !formData.dob && styles.placeholderText,
                    ]}>
                    {formData.dob || 'Select Date of Birth'}
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
                    maximumDate={eighteenYearsAgo} // Can't select dates that make user under 18
                    minimumDate={new Date(1900, 0, 1)} // Minimum reasonable birth year
                  />
                )}
              </View>

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
                        formData.gender === 'male' && styles.selectedPickerText,
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
                      formData.gender === 'non-binary' && styles.selectedPicker,
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
                      formData.orientation === 'other' && styles.selectedPicker,
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

              {/* Prompt Questions Section */}
              <View style={styles.inputContainer}>
                <Text style={styles.sectionTitle}>Complete Your Profile</Text>
                {promptCategories.length > 0 && (
                  <Text style={styles.sectionSubtitle}>
                    Select and answer at least 3 prompts to help others get to
                    know you better
                  </Text>
                )}

                {loadingPrompts ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading prompts...</Text>
                  </View>
                ) : promptCategories.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>
                      Profile prompts could not be loaded. You can still create
                      your account and add prompts later.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.promptsContainer}>
                    {/* Selected Answers Display */}
                    {selectedAnswers.length > 0 && (
                      <View style={styles.selectedAnswersContainer}>
                        <Text style={styles.selectedAnswersTitle}>
                          Your Selected Prompts:
                        </Text>
                        {selectedAnswers.map(answer => {
                          const category = promptCategories.find(
                            c => c.id === answer.categoryId
                          );
                          const question = category?.questions.find(
                            q => q.id === answer.questionId
                          );

                          return (
                            <View
                              key={`${answer.categoryId}-${answer.questionId}`}
                              style={styles.selectedAnswerItem}>
                              <View style={styles.selectedAnswerContent}>
                                <Text style={styles.selectedQuestionText}>
                                  {question?.question}
                                </Text>
                                <Text style={styles.selectedAnswerText}>
                                  {answer.answer}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() =>
                                  removeAnswer(
                                    answer.categoryId,
                                    answer.questionId
                                  )
                                }>
                                <Text style={styles.removeButtonText}>×</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Add New Prompt Button */}
                    <TouchableOpacity
                      style={styles.addPromptButton}
                      onPress={() => setShowQuestionModal(true)}>
                      <Text style={styles.addPromptButtonText}>
                        + Add Prompt Answer ({selectedAnswers.length}/∞)
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.promptSummary}>
                      <Text
                        style={[
                          styles.promptCountText,
                          selectedAnswers.length >= 3
                            ? styles.promptCountValid
                            : styles.promptCountInvalid,
                        ]}>
                        {selectedAnswers.length >= 3 ? '✓' : '⚠️'}{' '}
                        {selectedAnswers.length} prompts answered
                        {selectedAnswers.length >= 3
                          ? ' (Ready to proceed!)'
                          : ' (minimum 3 required)'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Question Selection Modal */}
              <Modal
                visible={showQuestionModal}
                animationType="slide"
                presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select a Prompt</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={closeModal}>
                      <Text style={styles.modalCloseButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalContent}>
                    {selectedQuestion ? (
                      // Answer Input Screen
                      <View style={styles.answerInputContainer}>
                        <Text style={styles.modalQuestionText}>
                          {selectedQuestion.question}
                        </Text>
                        <TextInput
                          style={styles.modalAnswerInput}
                          placeholder="Your answer..."
                          value={currentAnswer}
                          onChangeText={setCurrentAnswer}
                          multiline
                          numberOfLines={4}
                          maxLength={200}
                          autoFocus
                          autoCorrect={true}
                          keyboardType="default"
                        />
                        <Text style={styles.answerCounter}>
                          {currentAnswer.length}/200 characters
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.submitAnswerButton,
                            !currentAnswer.trim() && styles.disabledButton,
                          ]}
                          onPress={() => handleAnswerSubmit(currentAnswer)}
                          disabled={!currentAnswer.trim()}>
                          <Text style={styles.submitAnswerButtonText}>
                            Add Answer
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // Question Selection Screen
                      promptCategories.map(category => (
                        <View
                          key={category.id}
                          style={styles.modalCategoryContainer}>
                          <Text style={styles.modalCategoryTitle}>
                            {category.name}
                          </Text>
                          <Text style={styles.modalCategoryDescription}>
                            {category.description}
                          </Text>

                          {category.questions.map(question => {
                            const isAlreadyAnswered = selectedAnswers.some(
                              a =>
                                a.categoryId === category.id &&
                                a.questionId === question.id
                            );

                            return (
                              <TouchableOpacity
                                key={question.id}
                                style={[
                                  styles.questionOption,
                                  isAlreadyAnswered &&
                                    styles.questionOptionAnswered,
                                ]}
                                onPress={() => {
                                  if (!isAlreadyAnswered) {
                                    handleQuestionSelect(category, question);
                                  }
                                }}
                                disabled={isAlreadyAnswered}>
                                <Text
                                  style={[
                                    styles.questionOptionText,
                                    isAlreadyAnswered &&
                                      styles.questionOptionTextAnswered,
                                  ]}>
                                  {question.question}
                                  {isAlreadyAnswered && ' ✓'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))
                    )}
                  </ScrollView>
                </SafeAreaView>
              </Modal>

              <TouchableOpacity
                style={[
                  styles.signupButton,
                  signupMutation.isPending && styles.disabledButton,
                ]}
                onPress={handleSignup}
                disabled={signupMutation.isPending}>
                <Text style={styles.signupButtonText}>
                  {signupMutation.isPending
                    ? 'Creating Account...'
                    : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.back()}>
                <Text style={styles.loginButtonText}>Sign In</Text>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 15,
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
    marginLeft: 5,
  },
  signupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  loginButton: {
    padding: 10,
  },
  loginButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginLeft: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickerButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  },
  selectedPickerText: {
    fontSize: 14,
    color: '#fff',
  },
  datePickerButton: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  // Prompt Questions Styles
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  promptsContainer: {
    marginBottom: 10,
  },
  categoryContainer: {
    marginBottom: 25,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  questionContainer: {
    marginBottom: 15,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  answeredQuestionText: {
    color: '#007AFF',
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  answeredInput: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  answerCounter: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  promptSummary: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  promptCountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  promptCountValid: {
    color: '#28a745',
  },
  promptCountInvalid: {
    color: '#dc3545',
  },
  // New Dropdown Prompt Styles
  selectedAnswersContainer: {
    marginBottom: 20,
  },
  selectedAnswersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  selectedAnswerItem: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  selectedAnswerContent: {
    flex: 1,
  },
  selectedQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  selectedAnswerText: {
    fontSize: 14,
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#ff4757',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPromptButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  addPromptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalCategoryContainer: {
    marginBottom: 30,
  },
  modalCategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalCategoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  questionOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  questionOptionAnswered: {
    backgroundColor: '#e8f4fd',
    borderColor: '#007AFF',
    opacity: 0.6,
  },
  questionOptionText: {
    fontSize: 16,
    color: '#333',
  },
  questionOptionTextAnswered: {
    color: '#007AFF',
  },
  answerInputContainer: {
    padding: 20,
  },
  modalQuestionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modalAnswerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  submitAnswerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  submitAnswerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyToggleContainer: {
    marginBottom: 15,
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
});

export default SignupScreen;
