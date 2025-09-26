import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TonightLogo from '../components/TonightLogo';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services';
import { AuthResponseData } from '../types';

const LoginScreen: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debug: Log the Google Client ID
  console.log(
    'Google Web Client ID:',
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  );

  const emailLoginMutation = useMutation<
    AuthResponseData,
    Error,
    { identifier: string; password: string }
  >({
    mutationFn: loginData => authService.login(loginData),
    onSuccess: async data => {
      console.log('Login response data:', data);
      console.log('User data:', data.user);
      console.log('Data keys:', Object.keys(data || {}));
      console.log('Has user property:', 'user' in (data || {}));
      setErrorMessage('');
      if (data && data.user) {
        await login(data.user);
      } else {
        console.error('No user data in response');
        setErrorMessage('Login succeeded but no user data received');
      }
    },
    onError: error => {
      console.error('Login failed:', error);
      setErrorMessage(
        'Login failed. Please check your username/email and password.'
      );
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: (credential: string) => googleLogin(credential),
    onSuccess: () => {
      setErrorMessage('');
    },
    onError: (error: Error) => {
      console.error('Google login failed:', error);
      setErrorMessage('Google login failed. Please try again.');
    },
  });

  const handleEmailLogin = () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both username/email and password');
      return;
    }

    setErrorMessage('');
    emailLoginMutation.mutate({ identifier: identifier.trim(), password });
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage('');

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // For now, show that Google Auth would work with complete-profile endpoint
      setErrorMessage(
        'Google Auth will be integrated with complete-profile endpoint. Use signup for now.'
      );

      // In a real implementation, this would:
      // 1. Open Google OAuth flow
      // 2. Get authorization code
      // 3. Send to backend /auth/google endpoint
      // 4. Backend exchanges code for user info
      // 5. If new user, redirect to complete-profile
      // 6. If existing user, complete login
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setErrorMessage(
        'Google sign-in failed. Please try email/password login.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <TonightLogo size="large" />
          </View>
          <Text style={styles.subtitle}>Find your perfect date tonight</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Username or Email"
              value={identifier}
              onChangeText={text => {
                setIdentifier(text);
                if (errorMessage) setErrorMessage(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry
            />

            <TouchableOpacity
              style={[
                styles.loginButton,
                emailLoginMutation.isPending && styles.disabledButton,
              ]}
              onPress={handleEmailLogin}
              disabled={emailLoginMutation.isPending}>
              <Text style={styles.loginButtonText}>
                {emailLoginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <Text style={styles.dividerText}>OR</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.googleButton,
                googleLoginMutation.isPending && styles.disabledButton,
              ]}
              onPress={handleGoogleLogin}
              disabled={googleLoginMutation.isPending}>
              <Text style={styles.googleButtonText}>
                {googleLoginMutation.isPending
                  ? 'Signing in with Google...'
                  : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
          </View>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => router.push('/signup')}>
              <Text style={styles.signupButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  form: {
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#4285f4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledContainer: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 10,
  },
  disabledText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
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
  signupButton: {
    padding: 10,
  },
  signupButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
