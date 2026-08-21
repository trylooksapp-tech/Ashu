import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, setToken, getToken } from "@/src/api";

WebBrowser.maybeCompleteAuthSession();

export type User = { user_id: string; email: string; name?: string; picture?: string };

type AuthState = { user: User | null; loading: boolean; signIn: () => Promise<void>; signOut: () => Promise<void>; error?: string };

const AuthContext = createContext<AuthState>({ user: null, loading: true, signIn: async () => {}, signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);

const sentSessions = new Set<string>();

function extractSessionId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function exchangeSession(sessionId: string): Promise<User | null> {
  if (sentSessions.has(sessionId)) return null;
  sentSessions.add(sessionId);
  try {
    const res = await api("/auth/session", { method: "POST", body: JSON.stringify({ session_id: sessionId }) });
    await setToken(res.session_token);
    return res.user as User;
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const bootstrap = useCallback(async () => {
    try {
      // On web, check URL for session_id first (hash or query)
      if (Platform.OS === "web") {
        const raw = window.location.hash + window.location.search;
        const sid = extractSessionId(raw);
        if (sid) {
          const u = await exchangeSession(sid);
          if (u) setUser(u);
          const url = new URL(window.location.href);
          url.hash = "";
          url.searchParams.delete("session_id");
          window.history.replaceState(window.history.state, "", url.toString());
          if (u) { setLoading(false); return; }
        }
      } else {
        const initial = await Linking.getInitialURL();
        const sid = extractSessionId(initial);
        if (sid) {
          const u = await exchangeSession(sid);
          if (u) { setUser(u); setLoading(false); return; }
        }
      }
      // Otherwise check existing token
      const t = await getToken();
      if (t) {
        try {
          const me = await api("/auth/me");
          setUser(me);
        } catch {
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // Hot deep-link listener on mobile
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Linking.addEventListener("url", async ({ url }) => {
      const sid = extractSessionId(url);
      if (sid) {
        const u = await exchangeSession(sid);
        if (u) setUser(u);
      }
    });
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async () => {
    setError(undefined);
    try {
      const redirectUrl = Platform.OS === "web" ? window.location.origin + "/" : Linking.createURL("");
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      if (Platform.OS === "web") {
        window.location.href = authUrl;
        return;
      }
      // Mobile: capture URL via listener too (Android quirk)
      let capturedFromListener: string | null = null;
      const sub = Linking.addEventListener("url", ({ url }) => { capturedFromListener = url; });
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      sub.remove();
      let url: string | null = null;
      if (result.type === "success" && (result as any).url) url = (result as any).url;
      if (!url) url = capturedFromListener;
      if (!url) url = await Linking.getInitialURL();
      const sid = extractSessionId(url);
      if (!sid) { setError("Login cancelled"); return; }
      const u = await exchangeSession(sid);
      if (u) setUser(u); else setError("Could not complete login");
    } catch (e: any) {
      setError(e.message || "Login failed");
    }
  }, []);

  const signOut = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch {}
    await setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, error }}>{children}</AuthContext.Provider>;
}
