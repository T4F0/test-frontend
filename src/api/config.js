// src/api/config.js
const stripTrailingSlash = (value) => value.replace(/\/+$/, "");
const isProd = import.meta.env.PROD;
const isDev = import.meta.env.DEV;

const readEnv = (prodKey, defaultKey, fallback = "") => {
  const raw =
    import.meta.env[prodKey] || import.meta.env[defaultKey] || fallback;
  return `${raw}`.trim();
};

const envApiUrl = isDev
  ? readEnv("VITE_API_URL", "VITE_API_URL")
  : readEnv("VITE_PROD_API_URL", "VITE_PROD_API_URL");
// In dev, keep requests relative so the Vite proxy handles CORS.
const apiOrigin = isDev
  ? ""
  : envApiUrl
    ? stripTrailingSlash(envApiUrl)
    : "https://ercp-algerie.com";

export const API_BASE = apiOrigin ? `${apiOrigin}/api` : "/api";

const envWsBaseUrl = isDev
  ? readEnv("VITE_WS_BASE_URL", "VITE_WS_BASE_URL")
  : readEnv("VITE_PROD_WS_BASE_URL", "VITE_PROD_WS_BASE_URL");
const devWsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
const defaultDevWsBaseUrl = `${devWsProtocol}://${window.location.host}`;

export const WS_BASE_URL = isDev
  ? defaultDevWsBaseUrl
  : envWsBaseUrl
    ? stripTrailingSlash(envWsBaseUrl)
    : "wss://ercp-algerie.com";

const stunUrl = isDev
  ? readEnv("VITE_STUN_URL", "VITE_STUN_URL", "stun:stun.l.google.com:19302")
  : readEnv(
      "VITE_PROD_STUN_URL",
      "VITE_PROD_STUN_URL",
      "stun:stun.l.google.com:19302",
    );
const turnUrl = isDev
  ? readEnv("VITE_TURN_URL", "VITE_TURN_URL", "turn:ercp-algerie.com:3478")
  : readEnv(
      "VITE_PROD_TURN_URL",
      "VITE_PROD_TURN_URL",
      "turn:ercp-algerie.com:3478",
    );
const turnTcpUrl = isDev
  ? readEnv(
      "VITE_TURN_TCP_URL",
      "VITE_TURN_TCP_URL",
      "turn:ercp-algerie.com:3478?transport=tcp",
    )
  : readEnv(
      "VITE_PROD_TURN_TCP_URL",
      "VITE_PROD_TURN_TCP_URL",
      "turn:ercp-algerie.com:3478?transport=tcp",
    );
const turnUsername = isDev
  ? readEnv("VITE_TURN_USERNAME", "VITE_TURN_USERNAME", "admin")
  : readEnv("VITE_PROD_TURN_USERNAME", "VITE_PROD_TURN_USERNAME", "admin");
const turnCredential = isDev
  ? readEnv("VITE_TURN_CREDENTIAL", "VITE_TURN_CREDENTIAL", "admin")
  : readEnv("VITE_PROD_TURN_CREDENTIAL", "VITE_PROD_TURN_CREDENTIAL", "admin");

const turnAuth =
  turnUsername && turnCredential
    ? { username: turnUsername, credential: turnCredential }
    : {};

export const RTC_ICE_SERVERS = [
  { urls: stunUrl },
  { urls: turnUrl, ...turnAuth },
  { urls: turnTcpUrl, ...turnAuth },
];
