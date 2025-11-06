/**
 * Indonesian phone number formatter and validator
 * Handles conversion of local Indonesian numbers to international format
 */

/**
 * Formats Indonesian phone number to international format (62)
 * @param phone - Raw phone number input
 * @returns Formatted phone number or null if invalid
 */
export function formatIndonesianPhone(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Handle +62 format - remove the + sign
  if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(1);
  }
  // Handle 62 format - keep as is
  else if (cleaned.startsWith('62')) {
    // Keep as is
  }
  // Handle 08 format - replace leading 0 with 62
  else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  // Handle other formats that don't start with 62 or 0
  else if (!cleaned.startsWith('62')) {
    // Assume it's a local number without country code, add 62
    cleaned = '62' + cleaned;
  }
  
  // Validate the phone number length
  // Indonesian mobile numbers should be 10-13 digits after country code
  const digitsAfterCountryCode = cleaned.substring(2);
  
  if (digitsAfterCountryCode.length < 8 || digitsAfterCountryCode.length > 12) {
    return null; // Invalid length
  }
  
  // Basic validation for Indonesian mobile number prefixes
  const validPrefixes = [
    '81', '82', '83', '84', '85', '86', '87', '88', '89', // Major carriers
    '21', '22', '23', '24', '26', '27', '28', '29', // Area codes (landline)
  ];
  
  const prefix = digitsAfterCountryCode.substring(0, 2);
  
  // For mobile numbers (most common), check against valid mobile prefixes
  if (digitsAfterCountryCode.length >= 10 && !validPrefixes.some(p => digitsAfterCountryCode.startsWith(p))) {
    return null; // Invalid prefix
  }
  
  return cleaned;
}

/**
 * Validates if a phone number is a valid Indonesian number
 * @param phone - Phone number to validate
 * @returns Validation result
 */
export function isValidIndonesianPhone(phone: string): boolean {
  return formatIndonesianPhone(phone) !== null;
}

/**
 * Gets a user-friendly error message for invalid phone numbers
 * @param phone - Phone number to check
 * @returns Error message or null if valid
 */
export function getPhoneValidationError(phone: string): string | null {
  if (!phone.trim()) {
    return 'Phone number is required';
  }
  
  const formatted = formatIndonesianPhone(phone);
  if (!formatted) {
    return 'Please enter a valid Indonesian phone number (e.g., 08123456789 or +628123456789)';
  }
  
  return null;
}