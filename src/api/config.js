// src/api/config.js
const envApiUrl = import.meta.env.VITE_API_URL;

// If VITE_API_URL is set (e.g., in .env or production), use it as a base.
// In dev with Vite proxy, '/api' works. 
// For Electron production, we MUST have the full URL to prevent file:// resolution.
export const API_BASE = envApiUrl ? `${envApiUrl}/api` : '/api';
