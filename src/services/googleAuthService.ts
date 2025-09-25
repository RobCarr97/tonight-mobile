import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Complete the auth session on web
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  idToken: string;
  user: {
    email: string;
    name: string;
    photo?: string;
  };
}

class GoogleAuthService {
  async signIn(): Promise<GoogleAuthResult> {
    try {
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      if (!clientId) {
        throw new Error('Google Web Client ID not configured');
      }

      // Use a more reliable redirect URI setup for Expo
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'tonightmobile',
        path: 'auth',
      });

      console.log('Redirect URI:', redirectUri);

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
      });

      console.log('Starting auth request...');

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/oauth/authorize',
      });

      console.log('Auth result:', result);

      if (result.type === 'success' && result.params.code) {
        console.log('Got authorization code, exchanging for tokens...');

        // Exchange code for tokens
        const tokenResponse = await fetch(
          'https://oauth2.googleapis.com/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId,
              code: result.params.code,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
            }),
          }
        );

        const tokens = await tokenResponse.json();
        console.log('Token response:', tokens);

        if (!tokens.id_token) {
          throw new Error('No ID token received from Google');
        }

        // Decode the ID token to get user info
        const userInfo = this.parseJWTPayload(tokens.id_token);

        return {
          idToken: tokens.id_token,
          user: {
            email: userInfo.email,
            name: userInfo.name,
            photo: userInfo.picture,
          },
        };
      } else if (result.type === 'cancel') {
        throw new Error('User cancelled authentication');
      } else if (result.type === 'error') {
        throw new Error(
          `Authentication error: ${
            result.error?.description || 'Unknown error'
          }`
        );
      }

      throw new Error(`Authentication failed: ${result.type}`);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  }

  private parseJWTPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      throw new Error('Invalid JWT token');
    }
  }

  async signOut(): Promise<void> {
    // For AuthSession, we don't need to do anything special
    console.log('Google sign out completed');
  }

  async isSignedIn(): Promise<boolean> {
    // For AuthSession, we don't maintain sign-in state
    return false;
  }
}

export const googleAuthService = new GoogleAuthService();
