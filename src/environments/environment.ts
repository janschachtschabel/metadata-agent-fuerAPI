/**
 * Development Environment Configuration
 * 
 * This component uses the Metadata Agent API for all AI operations.
 * No local LLM configuration needed.
 */
export const environment = {
  production: false,
  
  // Debug/Logging Configuration
  logLevel: 'debug',
  
  // Metadata Agent API URL
  // Options:
  // - Local: 'http://localhost:8000'
  // - Vercel: 'https://metadata-agent-api.vercel.app'
  apiUrl: 'https://metadata-agent-api.vercel.app',
  
  // Default Schema Context
  defaultContext: 'default',
  defaultVersion: 'latest',
  
  // Default Layout
  defaultLayout: 'default'
};
