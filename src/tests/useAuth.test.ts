import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

// The facade useOpenBIS talks to; created once when useAuth.ts is loaded
const facade = vi.hoisted(() => ({
  _private: {} as Record<string, unknown>,
  setSessionToken: vi.fn(),
  getServerInformation: vi.fn(),
  getSessionInformation: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@openbis/openbis.esm", () => ({
  default: {
    openbis: function () {
      return facade;
    },
  },
}));

import { INSTANCE_COOKIE, TOKEN_KEY, useOpenBIS } from "../hooks/auth/useAuth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// In-memory stand-in for the browser's cookieStore, which jsdom doesn't provide
const cookies = new Map<string, { value: string; path?: string; expires?: number }>();
const cookieStore = {
  get: vi.fn(async (name: string) => (cookies.has(name) ? { name, ...cookies.get(name)! } : null)),
  set: vi.fn(async ({ name, ...rest }: { name: string; value: string; path?: string; expires?: number }) => {
    cookies.set(name, rest);
  }),
  delete: vi.fn(async ({ name }: { name: string }) => {
    cookies.delete(name);
  }),
};

const instanceCookie = () => document.cookie.match(new RegExp(`${INSTANCE_COOKIE}=([^;]*)`))?.[1] ?? "";

// Renders the hook and waits until the stored session has been checked
const renderAuth = async () => {
  const hook = renderHook(() => useOpenBIS());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook.result;
};

const acceptSession = (userName: string) => {
  facade.getServerInformation.mockResolvedValue({});
  facade.getSessionInformation.mockResolvedValue({ getUserName: () => userName });
};

beforeEach(() => {
  vi.stubGlobal("cookieStore", cookieStore);
  cookies.clear();
  localStorage.clear();
  document.cookie = `${INSTANCE_COOKIE}=; path=/; Max-Age=0`;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("on start-up", () => {
  test("without a stored session the user is logged out", async () => {
    const auth = await renderAuth();
    expect(auth.current.isAuthenticated).toBe(false);
    expect(auth.current.user).toBeNull();
    expect(facade.getServerInformation).not.toHaveBeenCalled();
  });

  test("a stored session accepted by openBIS logs the user in", async () => {
    cookies.set(TOKEN_KEY, { value: "token-1", path: "/" });
    acceptSession("jdoe");

    const auth = await renderAuth();
    expect(facade.setSessionToken).toHaveBeenCalledWith("token-1");
    expect(auth.current.isAuthenticated).toBe(true);
    expect(auth.current.user).toBe("jdoe");
    expect(auth.current.token).toBe("token-1");
  });

  test("a stored session is checked even without the openbis-instance cookie", async () => {
    // When iLog runs on the openBIS server, the openBIS UI's session cookie is shared and there is
    // no instance cookie; the session must not be thrown away for that reason
    cookies.set(TOKEN_KEY, { value: "token-1", path: "/" });
    acceptSession("jdoe");

    const auth = await renderAuth();
    expect(auth.current.isAuthenticated).toBe(true);
    expect(cookies.get(TOKEN_KEY)?.value).toBe("token-1");
  });

  test("a stored session rejected by openBIS is cleared", async () => {
    cookies.set(TOKEN_KEY, { value: "expired", path: "/" });
    document.cookie = `${INSTANCE_COOKIE}=openbis.example.org; path=/`;
    facade.getServerInformation.mockRejectedValue(new Error("Session expired"));

    const auth = await renderAuth();
    expect(auth.current.isAuthenticated).toBe(false);
    expect(cookies.has(TOKEN_KEY)).toBe(false);
    expect(instanceCookie()).toBe("");
  });

  test("the session data stored by older iLog versions is removed", async () => {
    localStorage.setItem("token", "old-token");
    localStorage.setItem("user", "old-user");

    await renderAuth();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});

describe("login", () => {
  test("stores the session token in the openbis cookie for 7 days", async () => {
    facade.login.mockResolvedValue("token-2");
    const auth = await renderAuth();

    const before = Date.now();
    let result: string | null = null;
    await act(async () => {
      result = await auth.current.login("jdoe", "secret");
    });

    expect(facade.login).toHaveBeenCalledWith("jdoe", "secret");
    expect(result).toBe("token-2");
    expect(auth.current.isAuthenticated).toBe(true);
    expect(auth.current.user).toBe("jdoe");

    const cookie = cookies.get(TOKEN_KEY)!;
    expect(cookie.value).toBe("token-2");
    expect(cookie.path).toBe("/");
    expect(cookie.expires).toBeGreaterThanOrEqual(before + SEVEN_DAYS_MS);
    expect(cookie.expires).toBeLessThanOrEqual(Date.now() + SEVEN_DAYS_MS);
  });

  test("a failed login leaves the user logged out", async () => {
    facade.login.mockRejectedValue(new Error("Wrong password"));
    const auth = await renderAuth();

    let result: string | null = "unset";
    await act(async () => {
      result = await auth.current.login("jdoe", "wrong");
    });

    expect(result).toBeNull();
    expect(auth.current.isAuthenticated).toBe(false);
    expect(cookies.has(TOKEN_KEY)).toBe(false);
  });

  test("login with a personal access token sets the openbis-instance cookie", async () => {
    acceptSession("jdoe");
    const auth = await renderAuth();

    await act(async () => {
      await auth.current.loginWithToken("pat-1", "openbis.example.org");
    });

    expect(instanceCookie()).toBe("openbis.example.org");
    expect(auth.current.isAuthenticated).toBe(true);
    expect(cookies.get(TOKEN_KEY)?.value).toBe("pat-1");
  });
});

test("logout ends the openBIS session and clears both cookies", async () => {
  cookies.set(TOKEN_KEY, { value: "token-1", path: "/" });
  document.cookie = `${INSTANCE_COOKIE}=openbis.example.org; path=/`;
  acceptSession("jdoe");
  facade.logout.mockResolvedValue(undefined);
  const auth = await renderAuth();

  await act(async () => {
    await auth.current.logout();
  });

  expect(facade.logout).toHaveBeenCalled();
  expect(auth.current.isAuthenticated).toBe(false);
  expect(cookies.has(TOKEN_KEY)).toBe(false);
  expect(instanceCookie()).toBe("");
});
