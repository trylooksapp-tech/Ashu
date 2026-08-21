import Constants from "expo-constants";
import { storage } from "@/src/utils/storage";

const BASE = (Constants.expoConfig?.extra?.backendUrl as string | undefined) || process.env.EXPO_PUBLIC_BACKEND_URL || "";
export const API = `${BASE}/api`;

const TOKEN_KEY = "aft_session_token";
let tokenCache: string | null = null;

export async function getToken(): Promise<string | null> {
  if (tokenCache !== null) return tokenCache;
  const t = await storage.secureGet(TOKEN_KEY, null as string | null);
  tokenCache = t;
  return t;
}
export async function setToken(t: string | null) {
  tokenCache = t;
  if (t) await storage.secureSet(TOKEN_KEY, t);
  else await storage.secureRemove(TOKEN_KEY);
}

export async function api(path: string, options: any = {}): Promise<any> {
  const token = await getToken();
  const r = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (r.status === 401) {
    await setToken(null);
    const err: any = new Error("Session expired");
    err.status = 401;
    throw err;
  }
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.detail || "Could not save this record");
  }
  return r.json();
}

export async function download(path: string, filename: string) {
  const token = await getToken();
  const r = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw new Error("Could not export file");
  const blob = await r.blob();
  if (typeof window !== "undefined" && (window as any).document) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
}
