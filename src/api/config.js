// src/api/config.js
const envApiUrl = import.meta.env.VITE_API_URL;
const defaultProdApiUrl = "https://tifu.me";

// If VITE_API_URL is set (e.g., in .env or production), use it as a base.
// In dev with Vite proxy, '/api' works.
// For production without a configured env var, fall back to the public API host.
export const API_BASE = envApiUrl
  ? `${envApiUrl}/api`
  : import.meta.env.PROD
    ? `${defaultProdApiUrl}/api`
    : "/api";
