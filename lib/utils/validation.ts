/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: "mismatch" | "tooShort";
}

/**
 * Validates password and confirmation match and minimum length
 * @param password - The password to validate
 * @param confirmPassword - The confirmation password
 * @param minLength - Minimum password length (default: 8)
 */
export function validatePassword(
  password: string,
  confirmPassword: string,
  minLength: number = 8
): PasswordValidationResult {
  if (password.length < minLength) {
    return { valid: false, error: "tooShort" };
  }

  if (password !== confirmPassword) {
    return { valid: false, error: "mismatch" };
  }

  return { valid: true };
}

/**
 * Validates email format
 * @param email - The email to validate
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if a string is empty or only whitespace
 * @param value - The string to check
 */
export function isEmpty(value: string): boolean {
  return !value || value.trim().length === 0;
}
