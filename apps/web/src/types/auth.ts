// types/auth.ts

// ========================
// REGISTRATION TYPES
// ========================

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string; // optional
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  result: {
    token: string;
    user?: {
      id: string;
      email: string;
      name: string;
    };
  };
}

// ========================
// LOGIN TYPES
// ========================

export interface LoginPayload {
  email: string;
  password: string;
}

// types/auth.ts
export interface LoginResponse {
  success: boolean;
  message: string;
  result: {
    token: string;
    user?: {
      id: string;
      email: string;
      name?: string;
      userType?: string;
      status?: string;
    };
  };
}


// ========================
// AUTH STATE TYPES
// ========================

export interface User {
  id: string;
  email: string;
  name?: string;
  userType?: string;
  status?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

// ========================
// FORGOT PASSWORD TYPES
// ========================

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

// types/auth.ts
export interface ResetPasswordPayload {
  email: string;
  otp: string;
  password: string;
}


export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// ========================
// VALIDATION TYPES
// ========================

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  general?: string;
}

// ========================
// API ERROR TYPES
// ========================

export interface ApiError {
  success: false;
  message: string;
  errors?: ValidationError[];
  statusCode?: number;
}
