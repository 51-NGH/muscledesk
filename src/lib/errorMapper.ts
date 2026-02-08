/**
 * Centralized error mapping utility for database and authentication errors.
 * Prevents leaking sensitive database schema details to users.
 */

export const mapDatabaseError = (error: Error | unknown): string => {
  if (!error) return 'An unexpected error occurred';
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const msg = errorMessage.toLowerCase();

  // Duplicate/unique constraint violations
  if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) {
    if (msg.includes('phone') || msg.includes('gym_id_phone')) return 'A member with this phone number already exists in your gym';
    if (msg.includes('email')) return 'A member with this email already exists';
    if (msg.includes('member_id')) return 'This member ID is already in use';
    return 'This record already exists';
  }

  // Foreign key violations
  if (msg.includes('foreign key') || msg.includes('violates foreign key')) {
    return 'Cannot complete operation: this record is linked to other data';
  }

  // RLS/permission errors
  if (msg.includes('permission') || msg.includes('policy') || msg.includes('rls') || 
      msg.includes('denied') || msg.includes('row-level security')) {
    return 'You do not have permission for this action';
  }

  // Constraint violations
  if (msg.includes('not-null') || msg.includes('null value') || msg.includes('check constraint')) {
    return 'Required information is missing. Please check your input.';
  }

  // Invalid data types
  if (msg.includes('invalid input') || msg.includes('invalid uuid') || msg.includes('malformed')) {
    return 'Invalid data format. Please check your input.';
  }

  // Network/connection errors
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Timeout errors
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Request timed out. Please try again.';
  }

  // Member limit reached
  if (msg.includes('member limit') || msg.includes('upgrade')) {
    return 'Member limit reached for your plan. Please upgrade to add more members.';
  }

  // Log the actual error for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error('Database error:', error);
  }

  return 'An error occurred. Please try again or contact support.';
};

export const mapAuthError = (error: Error | unknown): string => {
  if (!error) return 'An authentication error occurred';
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const msg = errorMessage.toLowerCase();

  // Invalid credentials
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || 
      msg.includes('invalid email or password')) {
    return 'Invalid email or password';
  }

  // Email not confirmed
  if (msg.includes('email not confirmed') || msg.includes('confirm')) {
    return 'Please check your email to verify your account before signing in';
  }

  // User not found
  if (msg.includes('user not found') || msg.includes('no user')) {
    return 'No account found with this email address';
  }

  // Email already registered
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists';
  }

  // Password requirements
  if (msg.includes('password') && (msg.includes('short') || msg.includes('weak') || msg.includes('length'))) {
    return 'Password must be at least 6 characters long';
  }

  // Rate limiting
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // Session expired
  if (msg.includes('session') || msg.includes('expired') || msg.includes('refresh')) {
    return 'Your session has expired. Please sign in again.';
  }

  // Log the actual error for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error('Auth error:', error);
  }

  return 'An authentication error occurred. Please try again.';
};
