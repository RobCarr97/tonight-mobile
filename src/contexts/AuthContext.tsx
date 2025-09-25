import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authService } from '../services';
import { CompleteProfileRequest, UserResponse } from '../types';
import { platformStorage } from '../utils/platformStorage';

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: UserResponse) => Promise<void>;
  signup: (profileData: CompleteProfileRequest) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserResponse) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from platformStorage on app start
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await platformStorage.getItem('userData');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Handle migration: if the stored user has a 'data' property, extract it
          if (parsedUser.data && parsedUser.success) {
            console.log('Migrating user data from old format');
            const migratedUser = parsedUser.data;
            setUser(migratedUser);
            // Update storage with the correct format
            await platformStorage.setItem('userData', JSON.stringify(migratedUser));
          } else {
            // Already in correct format
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const login = async (userData: UserResponse) => {
    try {
      if (!userData) {
        console.error('Login called with undefined userData');
        return;
      }
      setUser(userData);
      await platformStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to save user data:', error);
    }
  };

  const signup = async (profileData: CompleteProfileRequest) => {
    try {
      console.log('Creating user profile and logging in...');
      const userData = await authService.completeProfile(profileData);

      // Automatically log the user in after successful profile creation
      setUser(userData);
      await platformStorage.setItem('userData', JSON.stringify(userData));

      console.log('User created and logged in successfully:', userData);
    } catch (error) {
      console.error('Failed to create profile and login:', error);
      throw error;
    }
  };

  const googleLogin = async (credential: string) => {
    try {
      const authResponse = await authService.googleLogin(credential);
      setUser(authResponse.user);
      await platformStorage.setItem(
        'userData',
        JSON.stringify(authResponse.user)
      );
      if (authResponse.token) {
        await platformStorage.setItem('authToken', authResponse.token);
      }
    } catch (error) {
      console.error('Failed to login with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await platformStorage.removeItem('userData');
      await platformStorage.removeItem('authToken');
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  };

  const updateUser = async (userData: UserResponse) => {
    try {
      setUser(userData);
      await platformStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to update user data:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    googleLogin,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
