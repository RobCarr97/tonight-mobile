import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-aware storage utility
class PlatformStorage {
  private isWeb = Platform.OS === 'web';

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isWeb) {
        // Use localStorage for web
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } else {
        // Use AsyncStorage for mobile
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Failed to get item from storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isWeb) {
        // Use localStorage for web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } else {
        // Use AsyncStorage for mobile
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Failed to set item in storage:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isWeb) {
        // Use localStorage for web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        // Use AsyncStorage for mobile
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Failed to remove item from storage:', error);
    }
  }
}

export const platformStorage = new PlatformStorage();
export default platformStorage;
