/**
 * Excel file parsing utility for guest data import
 * Supports .xlsx and .xls file formats
 */

export interface ExcelRow {
  [key: string]: string | number | undefined;
}

export interface ParsedGuestData {
  name: string;
  phone: string;
  email?: string;
  category: 'VIP' | 'Regular';
  session: number;
  limit: number;
  notes?: string;
  tableNo?: string;
  errors: string[];
  isValid: boolean;
}

/**
 * Format Indonesian phone number
 * Converts local format (08123456789) to international format (628123456789)
 * Removes +62 prefix and replaces leading 0 with 62
 */
export const formatIndonesianPhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Handle +62 prefix
  if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(1); // Remove +
  }
  
  // Handle 62 prefix (already correct)
  if (cleaned.startsWith('62')) {
    return cleaned;
  }
  
  // Handle 0 prefix (local format)
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.substring(1);
  }
  
  // Add 62 prefix if no country code
  if (cleaned.length > 0 && !cleaned.startsWith('62')) {
    return '62' + cleaned;
  }
  
  return cleaned;
};

/**
 * Validate Indonesian phone number
 * Checks for correct length and format
 */
export const validateIndonesianPhone = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const formatted = formatIndonesianPhone(phone);
  
  // Check if starts with 62
  if (!formatted.startsWith('62')) {
    return { isValid: false, error: 'Phone number must start with 62' };
  }
  
  // Remove 62 prefix and check remaining digits
  const localNumber = formatted.substring(2);
  
  // Indonesian phone numbers should be 10-12 digits after country code
  if (localNumber.length < 8 || localNumber.length > 12) {
    return { isValid: false, error: 'Phone number must be 8-12 digits after country code' };
  }
  
  // Check if all digits
  if (!/^\d+$/.test(localNumber)) {
    return { isValid: false, error: 'Phone number must contain only digits' };
  }
  
  return { isValid: true };
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: true }; // Email is optional
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true };
};

/**
 * Parse and validate a single row of guest data
 */
export const parseGuestRow = (row: ExcelRow, rowIndex: number): ParsedGuestData => {
  const errors: string[] = [];
  
  // Extract and clean data
  const name = String(row.name || row.Name || row.Nama || '').trim();
  const phone = String(row.phone || row.Phone || row.WhatsApp || row['No HP'] || row['No. HP'] || '').trim();
  const email = String(row.email || row.Email || row['E-mail'] || '').trim();
  const category = String(row.category || row.Category || row.Kategori || 'Regular').trim();
  const session = Number(row.session || row.Session || row.Sesi || 1);
  const limit = Number(row.limit || row.Limit || row['Jumlah Tamu'] || 1);
  const notes = String(row.notes || row.Notes || row.Keterangan || row.info || row.Info || '').trim();
  const tableNo = String(row.tableNo || row['Table No'] || row['No Meja'] || row.table || row.Table || '').trim();
  
  // Validate required fields
  if (!name) {
    errors.push('Name is required');
  }
  
  if (!phone) {
    errors.push('Phone number is required');
  } else {
    const phoneValidation = validateIndonesianPhone(phone);
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error || 'Invalid phone number');
    }
  }
  
  // Validate optional fields
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error || 'Invalid email');
    }
  }
  
  // Validate category
  const validCategories = ['VIP', 'Regular', 'Reguler'];
  const normalizedCategory = category.toLowerCase();
  let finalCategory: 'VIP' | 'Regular' = 'Regular';
  
  if (normalizedCategory === 'vip') {
    finalCategory = 'VIP';
  } else if (validCategories.includes(category)) {
    finalCategory = 'Regular';
  } else if (category) {
    errors.push(`Invalid category "${category}". Must be VIP or Regular`);
  }
  
  // Validate session
  if (isNaN(session) || session < 1 || session > 2) {
    errors.push('Session must be 1 or 2');
  }
  
  // Validate limit
  if (isNaN(limit) || limit < 1 || limit > 10) {
    errors.push('Guest limit must be between 1 and 10');
  }
  
  return {
    name,
    phone: phone ? formatIndonesianPhone(phone) : '',
    email: email || undefined,
    category: finalCategory,
    session: isNaN(session) ? 1 : session,
    limit: isNaN(limit) ? 1 : limit,
    notes: notes || undefined,
    tableNo: tableNo || undefined,
    errors,
    isValid: errors.length === 0
  };
};

/**
 * Parse Excel file data
 * Expects an array of objects where each object represents a row
 */
export const parseExcelData = (data: ExcelRow[]): { guests: ParsedGuestData[]; totalRows: number; validRows: number; invalidRows: number } => {
  const guests: ParsedGuestData[] = [];
  let validRows = 0;
  let invalidRows = 0;
  
  data.forEach((row, index) => {
    const parsedGuest = parseGuestRow(row, index + 2); // +2 because row 1 is header, and we want 1-based indexing for display
    guests.push(parsedGuest);
    
    if (parsedGuest.isValid) {
      validRows++;
    } else {
      invalidRows++;
    }
  });
  
  return {
    guests,
    totalRows: data.length,
    validRows,
    invalidRows
  };
};

/**
 * Generate sample Excel data for download
 */
export const generateSampleExcelData = (): ExcelRow[] => {
  return [
    {
      Name: 'John Doe',
      Phone: '08123456789',
      Email: 'john@example.com',
      Category: 'VIP',
      Session: 1,
      Limit: 2,
      'Table No': 'A1',
      Notes: 'Vegetarian'
    },
    {
      Name: 'Jane Smith',
      Phone: '08234567890',
      Email: 'jane@example.com',
      Category: 'Regular',
      Session: 2,
      Limit: 1,
      'Table No': 'B2',
      Notes: 'Allergic to seafood'
    },
    {
      Name: 'Bob Johnson',
      Phone: '08345678901',
      Email: '',
      Category: 'Regular',
      Session: 1,
      Limit: 3,
      'Table No': 'C3',
      Notes: 'Family of 3'
    }
  ];
};