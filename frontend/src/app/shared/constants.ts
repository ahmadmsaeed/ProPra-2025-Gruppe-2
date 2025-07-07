/**
 * Common constants used throughout the application
 */

// Notification durations (in milliseconds)
export const NOTIFICATION_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000
} as const;

// Dialog sizes
export const DIALOG_SIZES = {
  SMALL: '400px',
  MEDIUM: '600px',
  LARGE: '800px',
  EXTRA_LARGE: '1000px'
} as const;

// Common form validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Dieses Feld ist erforderlich',
  EMAIL: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
  MIN_LENGTH: (length: number) => `Mindestens ${length} Zeichen erforderlich`,
  MAX_LENGTH: (length: number) => `Maximal ${length} Zeichen erlaubt`,
  PASSWORD_MISMATCH: 'Die Passwörter stimmen nicht überein',
  INVALID_SQL: 'Ungültige SQL-Syntax'
} as const;

// User roles
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  TUTOR: 'TUTOR',
  TEACHER: 'TEACHER'
} as const;

// Exercise difficulty levels
export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
} as const;

// Database complexity levels
export const COMPLEXITY_LEVELS = {
  SIMPLE: 'simple',
  MODERATE: 'moderate',
  COMPLEX: 'complex'
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE_MB: 10,
  ALLOWED_EXTENSIONS: ['.sql', '.txt'],
  ALLOWED_MIME_TYPES: [
    'text/plain', 
    'application/sql', 
    'text/sql'
  ]
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100]
} as const;

// Debounce timeouts (in milliseconds)
export const DEBOUNCE_TIME = {
  SEARCH: 300,
  FORM_VALIDATION: 500,
  API_CALLS: 1000
} as const;
