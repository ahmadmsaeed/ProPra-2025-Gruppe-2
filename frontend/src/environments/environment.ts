/**
 * Development environment configuration
 * Replace with environment.prod.ts when building for production
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  
  // Authentication settings
  authConfig: {
    tokenExpirationWarningThreshold: 5 * 60 * 1000, // 5 minutes in milliseconds
    sessionTimeout: 60 * 60 * 1000, // 1 hour in milliseconds
  },
  
  // Feature flags
  features: {
    enableTutorFunctionality: true,
    enableAdvancedDatabaseViews: true,
    enableDebugTools: false, // Disable auto-execution of queries
  },
  
  // Performance settings
  performance: {
    defaultDebounceTime: 300, // ms
    defaultThrottleTime: 300, // ms
    pageLoadTimeoutThreshold: 3000, // ms
  },
  
  // Logging level
  logLevel: 'debug', // 'debug' | 'info' | 'warn' | 'error' | 'none'
};
