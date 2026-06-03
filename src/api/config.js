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
const DEFAULT_PROD_API_ORIGIN = "https://ercp-algerie.com";

const normalizeProdApiOrigin = (value) => {
  if (isDev) return "";
  const origin = value ? stripTrailingSlash(value) : DEFAULT_PROD_API_ORIGIN;
  const frontendOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  // A Vercel frontend origin here would route /api downloads through Vercel
  // instead of Django, producing 502s for protected attachment endpoints.
  if (
    origin === frontendOrigin ||
    origin.includes("test-frontend-smoky-nine.vercel.app")
  ) {
    return DEFAULT_PROD_API_ORIGIN;
  }

  return origin;
};

// In dev, keep requests relative so the Vite proxy handles CORS.
const apiOrigin = isDev
  ? ""
  : normalizeProdApiOrigin(envApiUrl);

export const API_BASE = apiOrigin ? `${apiOrigin}/api` : "/api";

export const resolveApiUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      const frontendOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
      if (
        parsed.origin === frontendOrigin &&
        (parsed.pathname.startsWith("/api/") ||
          parsed.pathname.startsWith("/media/")) &&
        apiOrigin
      ) {
        return `${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return url;
    }
    return url;
  }
  if (!apiOrigin) return url;

  if (url.startsWith("/api/")) {
    return `${apiOrigin}${url}`;
  }

  if (url.startsWith("/media/")) {
    return `${apiOrigin}${url}`;
  }

  return url;
};

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
