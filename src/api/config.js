// src/api/config.js
const stripTrailingSlash = (value) => value.replace(/\/+$/, "");
const isProd = import.meta.env.PROD;

const readEnv = (prodKey, defaultKey, fallback = "") => {
  const raw = (isProd
    ? import.meta.env[prodKey]
    : import.meta.env[defaultKey]) || fallback;
  return `${raw}`.trim();
};

const envApiUrl = readEnv("VITE_PROD_API_URL", "VITE_API_URL");
const apiOrigin = envApiUrl
  ? stripTrailingSlash(envApiUrl)
  : isProd
    ? "https://tifu.me"
    : "";

export const API_BASE = apiOrigin ? `${apiOrigin}/api` : "/api";

const envWsBaseUrl = readEnv("VITE_PROD_WS_BASE_URL", "VITE_WS_BASE_URL");
const devWsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
const defaultDevWsBaseUrl = `${devWsProtocol}://${window.location.host}`;

export const WS_BASE_URL = envWsBaseUrl
  ? stripTrailingSlash(envWsBaseUrl)
  : isProd
    ? "wss://tifu.me"
    : defaultDevWsBaseUrl;

const stunUrl = readEnv(
  "VITE_PROD_STUN_URL",
  "VITE_STUN_URL",
  "stun:stun.l.google.com:19302",
);
const turnUrl = readEnv("VITE_PROD_TURN_URL", "VITE_TURN_URL", "turn:tifu.me:3478");
const turnTcpUrl = readEnv(
  "VITE_PROD_TURN_TCP_URL",
  "VITE_TURN_TCP_URL",
  "turn:tifu.me:3478?transport=tcp",
);
const turnUsername = readEnv("VITE_PROD_TURN_USERNAME", "VITE_TURN_USERNAME", "admin");
const turnCredential = readEnv(
  "VITE_PROD_TURN_CREDENTIAL",
  "VITE_TURN_CREDENTIAL",
  "admin",
);

const turnAuth = turnUsername && turnCredential
  ? { username: turnUsername, credential: turnCredential }
  : {};

export const RTC_ICE_SERVERS = [
  { urls: stunUrl },
  { urls: turnUrl, ...turnAuth },
  { urls: turnTcpUrl, ...turnAuth },
];
