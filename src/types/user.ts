// Gender and Orientation Types
export type Gender = 'male' | 'female' | 'non-binary' | 'other';

export type Orientation =
  | 'straight'
  | 'gay'
  | 'lesbian'
  | 'bisexual'
  | 'pansexual'
  | 'asexual'
  | 'other';

// User Prompt Answer Interface (matches API spec)
export interface UserPromptAnswer {
  categoryId: string;
  questionId: string;
  answer: string;
}

// For backwards compatibility
export interface PromptAnswer extends UserPromptAnswer {}

// User Interface (matches OpenAPI User schema)
export interface User {
  id: string;
  username: string;
  email: string;
  dob?: string; // Date of birth in ISO format (YYYY-MM-DD)
  gender?: Gender;
  orientation?: Orientation;
  promptAnswers?: UserPromptAnswer[];
}

// User Response Interface (matches OpenAPI UserResponse schema)
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  dob?: string;
  gender?: Gender;
  orientation?: Orientation;
  showGender?: boolean;
  showOrientation?: boolean;
  promptAnswers?: UserPromptAnswer[];
}

// Public User Profile Interface (matches OpenAPI PublicUserProfile schema)
export interface PublicUserProfile {
  id: string;
  username: string;
  dob: string;
  gender?: Gender; // Only present if user has showGender=true
  orientation?: Orientation; // Only present if user has showOrientation=true
  promptAnswers: UserPromptAnswer[];
}

// Signup Response Interface (matches OpenAPI SignupResponse schema)
export interface SignupResponse {
  username: string;
  email: string;
  dob?: string;
  gender?: Gender;
  orientation?: Orientation;
  promptAnswers?: UserPromptAnswer[];
}

// Login Request Interface (matches OpenAPI LoginRequest schema)
export interface LoginRequest {
  email: string;
  password: string;
}

// Google Auth Request Interface (matches OpenAPI GoogleAuthRequest schema)
export interface GoogleAuthRequest {
  token: string;
}

// Create User Request Interface (matches OpenAPI CreateUserRequest schema)
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  dob: string;
  gender: Gender;
  orientation: Orientation;
  showGender?: boolean;
  showOrientation?: boolean;
  promptAnswers?: UserPromptAnswer[];
}

// Complete Profile Request
export interface CompleteProfileRequest {
  username: string;
  email: string;
  dob: string; // Date of birth in ISO format (YYYY-MM-DD)
  gender: Gender;
  orientation: Orientation;
  showGender: boolean;
  showOrientation: boolean;
  password: string;
  promptAnswers: UserPromptAnswer[];
}

// Profile Update Request
export interface UpdateProfileRequest {
  username?: string;
  dob?: string;
  gender?: Gender;
  orientation?: Orientation;
  showGender?: boolean;
  showOrientation?: boolean;
  promptAnswers?: UserPromptAnswer[];
}

// Complete Profile Data (for profile completion endpoint)
export interface CompleteProfileData {
  dob: string;
  gender: Gender;
  orientation: Orientation;
  promptAnswers: UserPromptAnswer[];
}

// Authentication Response Data
export interface AuthResponseData {
  user: UserResponse;
  profileComplete: boolean;
  token?: string; // Optional token field for API authentication
}

// User Search Filters
export interface UserFilterRequest {
  venueId?: string;
  userLocation?: {
    lat: number;
    lng: number;
  };
  maxDistance?: number; // kilometers (0.1-50)
  minAge?: number; // 18-120
  maxAge?: number; // 18-120
  genders?: Gender[];
  orientations?: Orientation[];
  venueTypes?: ('bar' | 'restaurant' | 'coffee-shop')[];
}

// User Search Result
export interface UserSearchResult {
  id: string;
  dob: string;
  gender: string;
  orientation: string;
}
