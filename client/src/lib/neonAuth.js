import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const url = import.meta.env.VITE_NEON_AUTH_URL;
// createClient requires a dataApi url even though our Express API is the data layer,
// so fall back to the auth url.
const dataUrl = import.meta.env.VITE_NEON_DATA_API_URL || url;

export const neonEnabled = Boolean(url);

const client = neonEnabled
  ? createClient({
      auth: { adapter: BetterAuthReactAdapter(), url },
      dataApi: { url: dataUrl },
    })
  : null;

export const authClient = client?.auth;

let cachedToken = "";

export function getNeonToken() {
  return cachedToken;
}

export function clearNeonToken() {
  cachedToken = "";
}

// Dig a JWT string out of whatever shape the SDK returns.
export function asTokenString(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v.token === "string") return v.token;
  if (typeof v.data === "string") return v.data;
  if (typeof v.data?.token === "string") return v.data.token;
  if (typeof v.data?.session?.token === "string") return v.data.session.token;
  return "";
}

export async function refreshNeonToken() {
  if (!authClient) return "";
  let token = "";
  try {
    token = asTokenString(await authClient.token());
  } catch {
    // fall through to session lookup
  }
  if (!token) {
    try {
      token = asTokenString(await authClient.getSession());
    } catch {
      token = "";
    }
  }
  cachedToken = token;
  return token;
}

function unwrap(result) {
  if (result?.error) throw new Error(result.error.message || "Authentication failed");
  return result?.data ?? result;
}

export async function neonSignIn(email, password) {
  return unwrap(await authClient.signIn.email({ email, password }));
}

export async function neonSignUp(name, email, password) {
  return unwrap(await authClient.signUp.email({ name, email, password }));
}

export async function neonSignOut() {
  return authClient?.signOut();
}

export async function neonSession() {
  return authClient?.getSession();
}
