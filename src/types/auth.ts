// Auth types for authentication and session management
// Phase 1, Task 6

export interface SignInOptions {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  error?: string;
  success?: boolean;
}

export interface SessionOptions {
  rememberMe: boolean;
  expiresIn?: number; // seconds
}
