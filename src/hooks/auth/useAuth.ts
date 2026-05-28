import openbis from "@openbis/openbis.esm";
import { useState, useEffect } from "react";

export const INSTANCE_COOKIE = "openbis-instance";
// Cookie holding the openBIS session token
export const TOKEN_KEY = "openbis";
// localStorage keys used by older iLog versions to store the session, removed on start-up
const LEGACY_STORAGE_KEYS = ["token", "user"];

/**
 * The openBIS SDK ignores any path component in the URL passed to its constructor.
 * It only extracts protocol://authority and then always appends the hardcoded path /openbis/openbis/rmi-application-server-v3.json.
 * Passing "" causes the SDK to use a bare relative path, which the browser resolves against the current origin
 * (localhost:5173 in dev, the app domain in production).
 * The Vite plugin and Caddy then read the `openbis-instance` cookie that is set at login to determine which openBIS server to proxy to.
 * The browser automatically includes the cookie in every XHR the SDK fires.
 */

const _facade = new openbis.openbis("");
// @ts-ignore
_facade._private.log = () => {};

function getInstanceCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/openbis-instance=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setInstanceCookie(hostname: string): void {
  document.cookie = `${INSTANCE_COOKIE}=${encodeURIComponent(hostname)}; path=/; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`;
}

function clearInstanceCookie(): void {
  document.cookie = `${INSTANCE_COOKIE}=; path=/; Max-Age=0`;
}

export const useOpenBIS = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // True until the session token stored in the cookie has been checked
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // On mount: if a session token cookie and the instance cookie exist, verify the session is still valid
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof window === "undefined") return;
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

        const storedToken = (await cookieStore.get(TOKEN_KEY))?.value ?? null;
        if (!storedToken) return;
        if (!getInstanceCookie()) {
          await removeLoginInfo();
          return;
        }
        try {
          _facade.setSessionToken(storedToken);
          await _facade.getServerInformation();
          const sessionInfo = await _facade.getSessionInformation();
          await setLoginInfo(sessionInfo.getUserName(), storedToken);
        } catch {
          await removeLoginInfo();
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLoginInfo = async (username: string, sessionToken: string) => {
    setUser(username);
    setToken(sessionToken);
    setIsAuthenticated(true);
    await cookieStore.set(TOKEN_KEY, sessionToken);
    _facade.setSessionToken(sessionToken);
  };

  const removeLoginInfo = async () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    await cookieStore.delete(TOKEN_KEY);
    clearInstanceCookie();
  };

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      const sessionToken = await _facade.login(username, password);
      if (sessionToken === undefined) return null;
      await setLoginInfo(username, sessionToken);
      return sessionToken;
    } catch {
      await removeLoginInfo();
      return null;
    }
  };

  const loginWithToken = async (
    personalAccessToken: string,
    instanceHostname?: string,
  ): Promise<string | null> => {
    if (instanceHostname) {
      setInstanceCookie(instanceHostname);
    }
    try {
      _facade.setSessionToken(personalAccessToken);
      await _facade.getServerInformation();
      const sessionInfo = await _facade.getSessionInformation();
      const username = sessionInfo.getUserName();
      await setLoginInfo(username, personalAccessToken);
      return personalAccessToken;
    } catch {
      await removeLoginInfo();
      return null;
    }
  };

  const logout = async () => {
    try {
      if (token) await _facade.logout();
    } catch {}
    await removeLoginInfo();
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    token,
    login,
    loginWithToken,
    logout,
    apiFacade: _facade as openbis.OpenBISJavaScriptFacade,
    url: getInstanceCookie() ?? "",
    id: new Date(),
  };
};
