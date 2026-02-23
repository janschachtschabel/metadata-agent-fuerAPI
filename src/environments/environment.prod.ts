/**
 * Production Environment Configuration
 * 
 * This component uses the Metadata Agent API for all AI operations.
 * No local LLM configuration needed.
 */
export const environment = {
  production: true,
  
  // Debug/Logging Configuration
  logLevel: 'warn',
  
  // Metadata Agent API URL
  apiUrl: 'https://metadata-agent-api.vercel.app',
  
  // Default Schema Context
  defaultContext: 'default',
  defaultVersion: '1.8.1',
  
  // Default Layout
  defaultLayout: 'default'
};
