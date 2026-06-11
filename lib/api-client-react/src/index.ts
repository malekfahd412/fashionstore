export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  setBaseUrl,
  setAuthTokenGetter,
  setTokenRefresher,
  setOnAuthFailure,
} from "./custom-fetch";
export type { AuthTokenGetter, TokenRefresher, AuthFailureHandler } from "./custom-fetch";
