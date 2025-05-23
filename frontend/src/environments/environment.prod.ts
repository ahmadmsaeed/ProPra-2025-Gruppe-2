/**
 * Production environment configuration
 * Used when building with the production flag
 */
export const environment = {
  production: true,
  apiUrl: 'https://api.sql-learning-platform.com', // Replace with actual production API URL
  
  // Authentication settings
  authConfig: {
    tokenExpirationWarningThreshold: 5 * 60 * 1000, // 5 minutes in milliseconds
    sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds (shorter for security)
  },
  
  // Feature flags - disable experimental features in production
  features: {
    enableTutorFunctionality: true,
    enableAdvancedDatabaseViews: true,
    enableDebugTools: false, // Disable debug tools in production
  },
  
  // Performance settings - optimize for production
  performance: {
    defaultDebounceTime: 500, // Higher in production to reduce API load
    defaultThrottleTime: 500, // Higher in production to reduce API load
    pageLoadTimeoutThreshold: 5000, // Higher timeout for production network conditions
  },
  
  // Logging level - more restrictive in production
  logLevel: 'error', // Only log errors in production
};
